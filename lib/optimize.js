import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import CliProgress from 'cli-progress';
import execBuffer from 'exec-buffer';
import gifsicle from 'gifsicle';
import guetzli from 'guetzli';
import pLimit from 'p-limit';
import sharp from 'sharp';
import { optimize as svgoOptimize } from 'svgo';

import calcRatio from './calc-ratio.js';
import formatBytes from './format-bytes.js';
import getPlural from './get-plural.js';
import log from './log.js';
import optionsToArguments from './options-to-arguments.js';
import parseImageMetadata from './parse-image-metadata.js';
import prepareWriteFilePath from './prepare-write-file-path.js';
import showTotal from './show-total.js';

export default async function optimize({ inputFilePaths, outputDirectoryPath, isLossless, config }) {
	const inputFilePathsCount = inputFilePaths.length;

	if (inputFilePathsCount <= 0) {
		return;
	}

	log(`Optimizing ${inputFilePathsCount} ${getPlural(inputFilePathsCount, 'image', 'images')} (${isLossless ? 'lossless' : 'lossy'})...`);

	const progressBar = new CliProgress.SingleBar({
		format: `{bar} {percentage}% | Processed {value} of {total} ${getPlural(inputFilePathsCount, 'image', 'images')}`,
		clearOnComplete: true,
		stopOnComplete: true,
	}, CliProgress.Presets.shades_classic);

	progressBar.start(inputFilePathsCount, 0);

	const simultaneousTasksLimit = pLimit(
		/*
			Guetzli uses a large amount of memory and a significant amount of CPU time.
			To reduce the processor load in lossless mode, we reduce the number
			of simultaneous tasks by half.
		 */
		isLossless
			? Math.round(os.cpus().length / 2)
			: os.cpus().length,
	);
	const tasksErrors = [];
	const tasksPromises = inputFilePaths.map(
		filePath => simultaneousTasksLimit(
			() => processFile({
				filePath,
				config,
				isLossless,
				progressBar,
				tasksErrors,
			}),
		),
	);

	const totalSize = { before: 0, after: 0 };
	const tasksResults = await Promise.all(tasksPromises);

	for (const { fileBuffer, filePath } of tasksResults) {
		if (fileBuffer) {
			const fileSize = {
				before: fs.statSync(filePath).size,
				after: fileBuffer.length,
			};

			totalSize.before += fileSize.before;
			totalSize.after += Math.min(fileSize.before, fileSize.after);

			checkResult({
				fileBuffer,
				filePath,
				fileSize,
				outputDirectoryPath,
			});
		}
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

function checkResult({ fileBuffer, filePath, fileSize, outputDirectoryPath }) {
	if (!Buffer.isBuffer(fileBuffer) || typeof filePath !== 'string') {
		return;
	}

	const ratio = calcRatio(fileSize.before, fileSize.after);

	const isOptimized = ratio > 0;
	const isChanged = !fs.readFileSync(filePath).equals(fileBuffer);
	const isSvg = path.extname(filePath).toLowerCase() === '.svg';

	if (isOptimized || (isChanged && isSvg)) {
		try {
			fs.writeFileSync(
				prepareWriteFilePath(filePath, outputDirectoryPath),
				fileBuffer,
			);

			const before = formatBytes(fileSize.before);
			const after = formatBytes(fileSize.after);

			log(filePath, {
				type: isOptimized ? 'success' : 'warning',
				description: `${before} → ${after}. Ratio: ${ratio}%`,
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
	} else {
		log(filePath, {
			description: `${(isChanged ? 'File size increased' : 'Nothing changed')}. Skipped`,
			verboseOnly: true,
		});
	}
}

async function processFile({ filePath, config, isLossless, progressBar, tasksErrors }) {
	try {
		const fileBuffer = await processFileByFormat({
			filePath,
			config,
			isLossless,
		});

		return {
			fileBuffer,
			filePath,
		};
	} catch (error) {
		tasksErrors.push([
			filePath,
			{
				type: 'error',
				description: (error.message || '').trim(),
			},
		]);

		return {
			fileBuffer: undefined,
			filePath,
		};
	} finally {
		progressBar.increment();
	}
}

async function processFileByFormat({ filePath, config, isLossless }) {
	const fileBuffer = await fs.promises.readFile(filePath);
	const imageMetadata = await parseImageMetadata(fileBuffer);

	if (!imageMetadata.format) {
		throw new Error('Unknown file format');
	}

	switch (imageMetadata.format) {
		case 'jpeg': {
			return processJpeg({ fileBuffer, config, isLossless });
		}

		case 'png': {
			return processPng({ fileBuffer, config, isLossless });
		}

		case 'gif': {
			return processGif({ fileBuffer, config, isLossless });
		}

		case 'svg': {
			return processSvg({ fileBuffer, config });
		}

		default: {
			throw new Error(`Unsupported image format: "${imageMetadata.format}"`);
		}
	}
}

async function processJpeg({ fileBuffer, config, isLossless }) {
	const sharpImage = sharp(fileBuffer)
		.rotate(); // Rotate image using information from EXIF Orientation tag

	if (isLossless) {
		const inputBuffer = await sharpImage
			.toColorspace('srgb') // Replace colorspace (guetzli works only with sRGB)
			.jpeg({ quality: 100, optimizeCoding: false }) // Applying maximum quality to minimize losses during image processing with sharp
			.toBuffer();

		return execBuffer({
			bin: guetzli,
			args: [
				...optionsToArguments({
					options: config?.jpeg?.lossless || {},
				}),
				execBuffer.input,
				execBuffer.output,
			],
			input: inputBuffer,
		});
	}

	return sharpImage
		.jpeg(config?.jpeg?.lossy || {})
		.toBuffer();
}

function processPng({ fileBuffer, config, isLossless }) {
	return sharp(fileBuffer)
		.png(isLossless ? config?.png?.lossless : config?.png?.lossy || {})
		.toBuffer();
}

function processGif({ fileBuffer, config, isLossless }) {
	return execBuffer({
		bin: gifsicle,
		args: [
			...optionsToArguments({
				options: (isLossless ? config?.gif?.lossless : config?.gif?.lossy) || {},
				concat: true,
			}),
			`--threads=${os.cpus().length}`,
			'--no-warnings',
			'--output',
			execBuffer.output,
			execBuffer.input,
		],
		input: fileBuffer,
	});
}

function processSvg({ fileBuffer, config }) {
	return Buffer.from(
		svgoOptimize(
			fileBuffer,
			config.svg,
		).data,
	);
}
