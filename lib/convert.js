import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import CliProgress from 'cli-progress';
import execBuffer from 'exec-buffer';
import gif2webp from 'gif2webp-bin';
import pLimit from 'p-limit';
import sharp from 'sharp';

import calcRatio from './calc-ratio.js';
import checkFileExists from './check-file-exists.js';
import { SUPPORTED_FILE_TYPES } from './constants.js';
import formatBytes from './format-bytes.js';
import getPlural from './get-plural.js';
import log from './log.js';
import optionsToArguments from './options-to-arguments.js';
import parseImageMetadata from './parse-image-metadata.js';
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

	const avifConfig = isLossless
		? config?.avif?.lossless
		: config?.avif?.lossy;

	const webpConfig = isLossless
		? config?.webp?.lossless
		: config?.webp?.lossy;

	const webpGifConfig = isLossless
		? config?.webpGif?.lossless
		: config?.webpGif?.lossy;

	const totalSize = { before: 0, after: 0 };

	const tasksLogs = [];
	const tasksPromises = inputFilePaths.reduce((accumulator, filePath) => {
		if (shouldConvertToAvif) {
			accumulator.push(
				simultaneousTasksLimit(
					() => processFile({
						filePath,
						outputDirectoryPath,
						config: avifConfig || {},
						isForced,
						progressBar,
						totalSize,
						tasksLogs,
						format: 'AVIF',
						processFunction: processAvif,
					}),
				),
			);
		}

		if (shouldConvertToWebp) {
			accumulator.push(
				simultaneousTasksLimit(
					() => processFile({
						filePath,
						outputDirectoryPath,
						config: (path.extname(filePath).toLowerCase() === '.gif'
							? webpGifConfig
							: webpConfig)
							|| {},
						isForced,
						progressBar,
						totalSize,
						tasksLogs,
						format: 'WebP',
						processFunction: processWebp,
					}),
				),
			);
		}

		return accumulator;
	}, []);

	await Promise.all(tasksPromises);

	for (const message of tasksLogs) {
		log(...message);
	}

	console.log();
	showTotal(totalSize.before, totalSize.after);
}

async function processFile({ filePath, outputDirectoryPath, config, isForced, progressBar, totalSize, tasksLogs, format, processFunction }) {
	try {
		const { dir, name } = path.parse(filePath);
		const outputFilePath = path.join(dir, `${name}.${format.toLowerCase()}`);
		const preparedOutputFilePath = prepareWriteFilePath(outputFilePath, outputDirectoryPath);

		const isFileExists = await checkFileExists(preparedOutputFilePath);

		if (!isForced && isFileExists) {
			throw new Error(`File already exists, '${preparedOutputFilePath}'`);
		}

		const fileBuffer = await fs.promises.readFile(filePath);
		const processedFileBuffer = await processFunction({ fileBuffer, config });

		await fs.promises.writeFile(preparedOutputFilePath, processedFileBuffer);

		const fileSize = fileBuffer.length;
		const processedFileSize = processedFileBuffer.length;

		totalSize.before += fileSize;
		totalSize.after += Math.min(fileSize, processedFileSize);

		const ratio = calcRatio(fileSize, processedFileSize);
		const before = formatBytes(fileSize);
		const after = formatBytes(processedFileSize);

		tasksLogs.push([filePath, {
			type: 'success',
			description: `${before} → ${format} ${after}. Ratio: ${ratio}%`,
		}]);
	} catch (error) {
		if (error.message) {
			tasksLogs.push([filePath, {
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
	const imageMetadata = await parseImageMetadata(fileBuffer);
	checkImageFormat(imageMetadata.format);

	const isAnimated = imageMetadata.pages > 1;

	if (isAnimated) {
		throw new Error('Animated AVIF is not supported'); // See: https://github.com/strukturag/libheif/issues/377
	}

	return sharp(fileBuffer)
		.rotate() // Rotate image using information from EXIF Orientation tag
		.avif(config)
		.toBuffer();
}

async function processWebp({ fileBuffer, config }) {
	const imageMetadata = await parseImageMetadata(fileBuffer);
	checkImageFormat(imageMetadata.format);

	if (imageMetadata.format === 'gif') {
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
