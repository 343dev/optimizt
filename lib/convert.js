import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import CliProgress from 'cli-progress';
import execBuffer from 'exec-buffer';
import gif2webp from 'gif2webp-bin';
import pLimit from 'p-limit';
import sharp from 'sharp';

import calcRatio from './calc-ratio.js';
import { SUPPORTED_FILE_TYPES } from './constants.js';
import formatBytes from './format-bytes.js';
import getImageFormat from './get-image-format.js';
import getPlural from './get-plural.js';
import log from './log.js';
import optionsToArguments from './options-to-arguments.js';
import prepareWriteFilePath from './prepare-write-file-path.js';
import showTotal from './show-total.js';

export default async function convert({ inputFilePaths, outputDirectoryPath, isLossless, config, shouldConvertToAvif, shouldConvertToWebp, isForced }) {
	const inputFilePathsCount = inputFilePaths.length;

	if (!inputFilePathsCount) {
		return;
	}

	log(`Converting ${inputFilePathsCount} ${getPlural(inputFilePathsCount, 'image', 'images')} (${isLossless ? 'lossless' : 'lossy'})...`);

	const progressBar = new CliProgress.SingleBar({
		format: `{bar} {percentage}% | Processed {value} of {total} ${getPlural(inputFilePathsCount, 'image', 'images')}`,
		clearOnComplete: true,
		stopOnComplete: true,
	}, CliProgress.Presets.shades_classic);

	progressBar.start(inputFilePathsCount, 0);

	const simultaneousTasksLimit = pLimit(os.cpus().length);
	const tasksErrors = [];

	const avifConfig = isLossless
		? config?.avif?.lossless
		: config?.avif?.lossy;

	const webpConfig = isLossless
		? config?.webp?.lossless
		: config?.webp?.lossy;

	const webpGifConfig = isLossless
		? config?.webpGif?.lossless
		: config?.webpGif?.lossy;

	const tasksPromises = inputFilePaths.reduce((accumulator, filePath) => {
		if (shouldConvertToAvif) {
			accumulator.push(
				simultaneousTasksLimit(
					() => processFile({
						filePath,
						config: avifConfig || {},
						progressBar,
						tasksErrors,
						format: 'AVIF',
						processFunction: processAvif,
						outputDirectoryPath,
						isForced,
					}),
				),
			);
		}

		if (shouldConvertToWebp) {
			accumulator.push(
				simultaneousTasksLimit(
					() => processFile({
						filePath,
						config: (path.extname(filePath).toLowerCase() === '.gif'
							? webpGifConfig
							: webpConfig)
							|| {},
						progressBar,
						tasksErrors,
						format: 'WebP',
						processFunction: processWebp,
						outputDirectoryPath,
						isForced,
					}),
				),
			);
		}

		return accumulator;
	}, []);

	const totalSize = { before: 0, after: 0 };
	const tasksResult = await Promise.all(tasksPromises);

	for (const { fileBuffer, filePath, format } of tasksResult.filter(Boolean)) {
		const fileSize = {
			before: fs.statSync(filePath).size,
			after: fileBuffer.length,
		};

		totalSize.before += fileSize.before;
		totalSize.after += Math.min(fileSize.before, fileSize.after);

		writeResult({
			fileBuffer,
			filePath,
			fileSize,
			outputDirectoryPath,
			format,
		});
	}

	handleTasksErrors(tasksErrors);

	console.log();
	showTotal(totalSize.before, totalSize.after);
}

function handleTasksErrors(errors) {
	for (const error of errors) {
		log(...error);
	}
}

function prepareOutputFilePath(filePath, format) {
	const { dir, name } = path.parse(filePath);
	return path.join(dir, `${name}.${format.toLowerCase()}`);
}

function writeResult({ fileBuffer, filePath, fileSize, outputDirectoryPath, format }) {
	if (!Buffer.isBuffer(fileBuffer) || typeof filePath !== 'string') {
		return;
	}

	try {
		const writeFilePath = prepareWriteFilePath(
			prepareOutputFilePath(filePath, format),
			outputDirectoryPath,
		);

		fs.writeFileSync(writeFilePath, fileBuffer);

		const before = formatBytes(fileSize.before);
		const after = formatBytes(fileSize.after);
		const ratio = calcRatio(fileSize.before, fileSize.after);

		log(filePath, {
			type: 'success',
			description: `${before} → ${format} ${after}. Ratio: ${ratio}%`,
		});
	} catch (error) {
		if (error.message) {
			log(filePath, {
				type: 'error',
				description: error.message,
			});
		} else {
			console.error(error);
		}
	}
}

async function processFile({ filePath, config, progressBar, tasksErrors, format, processFunction, outputDirectoryPath, isForced }) {
	try {
		const fileBuffer = await fs.promises.readFile(filePath);

		const writeFilePath = prepareWriteFilePath(
			prepareOutputFilePath(filePath, format),
			outputDirectoryPath,
		);

		if (!isForced && fs.existsSync(writeFilePath)) {
			throw new Error(`File already exists, '${writeFilePath}'`);
		}

		return {
			fileBuffer: await processFunction({ fileBuffer, config }),
			filePath,
			format,
		};
	} catch (error) {
		if (error.message) {
			tasksErrors.push([filePath, {
				type: 'error',
				description: (error.message || '').trim(),
			}]);
		} else {
			console.error(error);
		}
	} finally {
		progressBar.increment();
	}
}

async function processAvif({ fileBuffer, config }) {
	checkImageFormat(await getImageFormat(fileBuffer));

	return sharp(fileBuffer)
		.rotate() // Rotate image using information from EXIF Orientation tag
		.avif(config)
		.toBuffer();
}

async function processWebp({ fileBuffer, config }) {
	const imageFormat = await getImageFormat(fileBuffer);
	checkImageFormat(imageFormat);

	if (imageFormat === 'gif') {
		return execBuffer({
			bin: gif2webp,
			args: [
				...optionsToArguments({
					options: config,
					prefix: '-',
				}),
				execBuffer.input,
				'-o',
				execBuffer.output,
			],
			input: fileBuffer,
		});
	}

	return sharp(fileBuffer)
		.rotate() // Rotate image using information from EXIF Orientation tag
		.webp(config)
		.toBuffer();
}

function checkImageFormat(imageFormat) {
	if (!imageFormat) {
		throw new Error('Unknown file format');
	}

	if (!SUPPORTED_FILE_TYPES.CONVERT.includes(imageFormat)) {
		throw new Error(`Unsupported image format: "${imageFormat}"`);
	}
}
