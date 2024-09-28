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
import getPlural from './get-plural.js';
import {
	log,
	logEmptyLine,
	logProgress,
	logProgressVerbose,
} from './log.js';
import optionsToArguments from './options-to-arguments.js';
import parseImageMetadata from './parse-image-metadata.js';
import prepareWriteFilePath from './prepare-write-file-path.js';
import showTotal from './show-total.js';

export default async function convert({
	inputFilePaths,
	outputDirectoryPath,
	isLossless,
	config,
	shouldConvertToAvif,
	shouldConvertToWebp,
	isForced,
}) {
	const inputFilePathsCount = inputFilePaths.length;

	if (!inputFilePathsCount) {
		return;
	}

	log(`Converting ${inputFilePathsCount} ${getPlural(inputFilePathsCount, 'image', 'images')} (${isLossless ? 'lossless' : 'lossy'})...`);

	const progressBarTotal = shouldConvertToAvif && shouldConvertToWebp
		? inputFilePathsCount * 2
		: inputFilePathsCount;
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
	const tasksPromises = inputFilePaths.reduce((accumulator, filePath) => {
		if (shouldConvertToAvif) {
			accumulator.push(
				tasksSimultaneousLimit(
					() => processFile({
						filePath,
						outputDirectoryPath,
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
						outputDirectoryPath,
						config: (path.extname(filePath).toLowerCase() === '.gif'
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

	logEmptyLine();
	showTotal(totalSize.before, totalSize.after);
}

async function processFile({
	filePath,
	outputDirectoryPath,
	config,
	progressBarContainer,
	progressBar,
	totalSize,
	isForced,
	format,
	processFunction,
}) {
	try {
		const { dir, name } = path.parse(filePath);
		const outputFilePath = path.join(dir, `${name}.${format.toLowerCase()}`);
		const preparedOutputFilePath = prepareWriteFilePath(outputFilePath, outputDirectoryPath);

		const isAccessible = await checkPathAccessibility(preparedOutputFilePath);

		if (!isForced && isAccessible) {
			logProgressVerbose(preparedOutputFilePath, {
				description: `File already exists, '${preparedOutputFilePath}'`,
				progressBarContainer,
			});

			return;
		}

		const fileBuffer = await fs.promises.readFile(filePath);
		const processedFileBuffer = await processFunction({ fileBuffer, config });

		await fs.promises.writeFile(preparedOutputFilePath, processedFileBuffer);

		const fileSize = fileBuffer.length;
		const processedFileSize = processedFileBuffer.length;

		totalSize.before += fileSize;
		totalSize.after += Math.min(fileSize, processedFileSize);

		const ratio = calculateRatio(fileSize, processedFileSize);
		const before = formatBytes(fileSize);
		const after = formatBytes(processedFileSize);

		logProgress(filePath, {
			type: 'success',
			description: `${before} → ${format} ${after}. Ratio: ${ratio}%`,
			progressBarContainer,
		});
	} catch (error) {
		if (error.message) {
			logProgress(filePath, {
				type: 'error',
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
