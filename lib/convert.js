import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import execBuffer from 'exec-buffer';
import gif2webp from 'gif2webp-bin';
import pLimit from 'p-limit';
import sharp from 'sharp';

import { calculateRatio } from './calculate-ratio.js';
import { checkPathAccessibility } from './check-path-accessibility.js';
import { createProgressBarContainer } from './create-progress-bar-container.js';
import { SUPPORTED_FILE_TYPES } from './constants.js';
import { formatBytes } from './format-bytes.js';
import { getPlural } from './get-plural.js';
import { getRelativePath } from './get-relative-path.js';
import {
	LOG_TYPES,
	log,
	logProgress,
	logProgressVerbose,
} from './log.js';
import { optionsToArguments } from './options-to-arguments.js';
import { parseImageMetadata } from './parse-image-metadata.js';
import { programOptions } from './program-options.js';
import { showTotal } from './show-total.js';

export async function convert({ filePaths, config }) {
	const {
		isForced,
		isLossless,
		shouldConvertToAvif,
		shouldConvertToWebp,
	} = programOptions;

	const filePathsCount = filePaths.length;

	if (!filePathsCount) {
		return;
	}

	log(`Converting ${filePathsCount} ${getPlural(filePathsCount, 'image', 'images')} (${isLossless ? 'lossless' : 'lossy'})...`);

	const progressBarTotal = shouldConvertToAvif && shouldConvertToWebp
		? filePathsCount * 2
		: filePathsCount;
	const progressBarContainer = createProgressBarContainer(progressBarTotal);
	const progressBar = progressBarContainer.create(progressBarTotal, 0);

	const totalSize = { before: 0, after: 0 };

	const avifConfig = isLossless
		? config?.avif?.lossless
		: config?.avif?.lossy;
	const webpConfig = isLossless
		? config?.webp?.lossless
		: config?.webp?.lossy;
	const webpGifConfig = isLossless
		? config?.webpGif?.lossless
		: config?.webpGif?.lossy;

	const tasksSimultaneousLimit = pLimit(os.cpus().length);
	const tasksPromises = filePaths.reduce((accumulator, filePath) => {
		if (shouldConvertToAvif) {
			accumulator.push(
				tasksSimultaneousLimit(
					() => processFile({
						filePath,
						config: avifConfig || {},
						progressBarContainer,
						progressBar,
						totalSize,
						isForced,
						format: 'AVIF',
						processFunction: processAvif,
					}),
				),
			);
		}

		if (shouldConvertToWebp) {
			accumulator.push(
				tasksSimultaneousLimit(
					() => processFile({
						filePath,
						config: (path.extname(filePath.input).toLowerCase() === '.gif'
							? webpGifConfig
							: webpConfig)
							|| {},
						progressBarContainer,
						progressBar,
						totalSize,
						isForced,
						format: 'WebP',
						processFunction: processWebp,
					}),
				),
			);
		}

		return accumulator;
	}, []);

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
	isForced,
	format,
	processFunction,
}) {
	try {
		const { dir, name } = path.parse(filePath.output);
		const outputFilePath = path.join(dir, `${name}.${format.toLowerCase()}`);

		const isAccessible = await checkPathAccessibility(outputFilePath);

		if (!isForced && isAccessible) {
			logProgressVerbose(getRelativePath(outputFilePath), {
				description: `File already exists, '${outputFilePath}'`,
				progressBarContainer,
			});

			return;
		}

		const fileBuffer = await fs.promises.readFile(filePath.input);
		const processedFileBuffer = await processFunction({ fileBuffer, config });

		await fs.promises.mkdir(path.dirname(outputFilePath), { recursive: true });
		await fs.promises.writeFile(outputFilePath, processedFileBuffer);

		const fileSize = fileBuffer.length;
		const processedFileSize = processedFileBuffer.length;

		totalSize.before += fileSize;
		totalSize.after += Math.min(fileSize, processedFileSize);

		const ratio = calculateRatio(fileSize, processedFileSize);
		const before = formatBytes(fileSize);
		const after = formatBytes(processedFileSize);

		logProgress(getRelativePath(filePath.input), {
			type: LOG_TYPES.SUCCESS,
			description: `${before} → ${format} ${after}. Ratio: ${ratio}%`,
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
