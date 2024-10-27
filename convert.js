import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import pLimit from 'p-limit';
import sharp from 'sharp';

import { calculateRatio } from './lib/calculate-ratio.js';
import { checkPathAccessibility } from './lib/check-path-accessibility.js';
import { createProgressBarContainer } from './lib/create-progress-bar-container.js';
import { SUPPORTED_FILE_TYPES } from './lib/constants.js';
import { formatBytes } from './lib/format-bytes.js';
import { getPlural } from './lib/get-plural.js';
import { getRelativePath } from './lib/get-relative-path.js';
import {
	LOG_TYPES,
	log,
	logProgress,
	logProgressVerbose,
} from './lib/log.js';
import { parseImageMetadata } from './lib/parse-image-metadata.js';
import { programOptions } from './lib/program-options.js';
import { showTotal } from './lib/show-total.js';

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

	const getConfig = format => config?.[format]?.[isLossless ? 'lossless' : 'lossy'];

	const avifConfig = getConfig('avif');
	const webpConfig = getConfig('webp');
	const webpGifConfig = getConfig('webpGif');

	const cpuCount = os.cpus().length;
	const tasksSimultaneousLimit = pLimit(cpuCount);

	await Promise.all(
		filePaths.reduce((accumulator, filePath) => {
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
				const isGif = path.extname(filePath.input).toLowerCase() === '.gif';

				accumulator.push(
					tasksSimultaneousLimit(
						() => processFile({
							filePath,
							config: (isGif ? webpGifConfig : webpConfig) || {},
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
		}, []),
	);

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

	const isAnimated = imageMetadata.pages > 1;

	return sharp(fileBuffer, { animated: isAnimated })
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
