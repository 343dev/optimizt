import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import execBuffer from 'exec-buffer';
import gifsicle from 'gifsicle';
import guetzli from 'guetzli';
import pLimit from 'p-limit';
import sharp from 'sharp';
import { optimize as svgoOptimize } from 'svgo';

import { calculateRatio } from './lib/calculate-ratio.js';
import { createProgressBarContainer } from './lib/create-progress-bar-container.js';
import { formatBytes } from './lib/format-bytes.js';
import { getPlural } from './lib/get-plural.js';
import { getRelativePath } from './lib/get-relative-path.js';
import {
	LOG_TYPES,
	log,
	logProgress,
	logProgressVerbose,
} from './lib/log.js';
import { optionsToArguments } from './lib/options-to-arguments.js';
import { parseImageMetadata } from './lib/parse-image-metadata.js';
import { programOptions } from './lib/program-options.js';
import { showTotal } from './lib/show-total.js';

export async function optimize({ filePaths, config }) {
	const { isLossless } = programOptions;

	const filePathsCount = filePaths.length;

	if (filePathsCount <= 0) {
		return;
	}

	log(`Optimizing ${filePathsCount} ${getPlural(filePathsCount, 'image', 'images')} (${isLossless ? 'lossless' : 'lossy'})...`);

	const progressBarContainer = createProgressBarContainer(filePathsCount);
	const progressBar = progressBarContainer.create(filePathsCount, 0);

	const totalSize = { before: 0, after: 0 };

	const cpuCount = os.cpus().length;
	const tasksSimultaneousLimit = pLimit(
		/*
			Guetzli uses a large amount of memory and a significant amount of CPU time.
			To reduce the processor load in lossless mode, we reduce the number
			of simultaneous tasks by half.
		 */
		isLossless ? Math.round(cpuCount / 2) : cpuCount,
	);
	const tasksPromises = filePaths.map(
		filePath => tasksSimultaneousLimit(
			() => processFile({
				filePath,
				config,
				progressBarContainer,
				progressBar,
				totalSize,
				isLossless,
			}),
		),
	);

	await Promise.all(tasksPromises);
	progressBarContainer.update(); // Prevent logs lost. See: https://github.com/npkgz/cli-progress/issues/145#issuecomment-1859594159
	progressBarContainer.stop();

	showTotal(totalSize.before, totalSize.after);
}

async function processFile({
	filePath,
	config,
	progressBarContainer,
	progressBar,
	totalSize,
	isLossless,
}) {
	try {
		const fileBuffer = await fs.promises.readFile(filePath.input);
		const processedFileBuffer = await processFileByFormat({ fileBuffer, config, isLossless });

		const fileSize = fileBuffer.length;
		const processedFileSize = processedFileBuffer.length;

		totalSize.before += fileSize;
		totalSize.after += Math.min(fileSize, processedFileSize);

		const ratio = calculateRatio(fileSize, processedFileSize);

		const isOptimized = ratio > 0;
		const isChanged = !fileBuffer.equals(processedFileBuffer);
		const isSvg = path.extname(filePath.input).toLowerCase() === '.svg';

		if (!isOptimized && !(isChanged && isSvg)) {
			logProgressVerbose(getRelativePath(filePath.input), {
				description: `${(isChanged ? 'File size increased' : 'Nothing changed')}. Skipped`,
				progressBarContainer,
			});

			return;
		}

		await fs.promises.mkdir(path.dirname(filePath.output), { recursive: true });
		await fs.promises.writeFile(filePath.output, processedFileBuffer);

		const before = formatBytes(fileSize);
		const after = formatBytes(processedFileSize);

		logProgress(getRelativePath(filePath.input), {
			type: isOptimized ? LOG_TYPES.SUCCESS : LOG_TYPES.WARNING,
			description: `${before} → ${after}. Ratio: ${ratio}%`,
			progressBarContainer,
		});
	} catch (error) {
		if (error.message) {
			logProgress(getRelativePath(filePath.input), {
				type: LOG_TYPES.ERROR,
				description: (error.message || '').trim(),
				progressBarContainer,
			});
		} else {
			progressBarContainer.log(error);
		}
	} finally {
		progressBar.increment();
	}
}

async function processFileByFormat({ fileBuffer, config, isLossless }) {
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
