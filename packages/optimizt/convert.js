import fs from 'node:fs';
import os from 'node:os';

import pLimit from 'p-limit';

import { atomicWrite } from './lib/atomic-write.js';
import { calculateRatio } from './lib/calculate-ratio.js';
import { createProgressBarContainer } from './lib/create-progress-bar-container.js';
import { SUPPORTED_FILE_TYPES } from './lib/constants.js';
import { describeCodecFailure } from './lib/describe-codec-failure.js';
import { formatBytes } from './lib/format-bytes.js';
import { getPlural } from './lib/get-plural.js';
import { getRelativePath } from './lib/get-relative-path.js';
import { isInterrupted } from './lib/lifecycle.js';
import sharp from './lib/sharp.js';
import {
	LOG_TYPES,
	log,
	logProgress,
	logProgressVerbose,
} from './lib/log.js';
import { OUTCOME_STATUS } from './lib/outcome-status.js';
import { parseImageMetadata } from './lib/parse-image-metadata.js';
import { programOptions } from './lib/program-options.js';
import { showTotal } from './lib/show-total.js';

export async function convert({ operations, config, configPath }) {
	const { isLossless } = programOptions;
	const filePathsCount = new Set(operations.map(operation => operation.input)).size;

	if (!filePathsCount) {
		return;
	}

	log(`Converting ${filePathsCount} ${getPlural(filePathsCount, 'image', 'images')} (${isLossless ? 'lossless' : 'lossy'})...`);

	const progressBarTotal = operations.length;
	const progressBarContainer = createProgressBarContainer(progressBarTotal);
	const progressBar = progressBarContainer.create(progressBarTotal, 0);

	const totalSize = { before: 0, after: 0 };

	const getConfig = format => config?.[format]?.[isLossless ? 'lossless' : 'lossy'];

	const avifConfig = getConfig('avif');
	const webpConfig = getConfig('webp');

	const cpuCount = os.cpus().length;
	const tasksSimultaneousLimit = pLimit(cpuCount);

	const outcomes = await Promise.all(operations.map((operation, planIndex) => tasksSimultaneousLimit(() => {
		if (isInterrupted()) return { planIndex, status: OUTCOME_STATUS.UNSTARTED };
		const isAvif = operation.format === 'avif';
		return processFile({
			config: (isAvif ? avifConfig : webpConfig) || {},
			configPath,
			filePath: { input: operation.input, output: operation.output },
			format: isAvif ? 'AVIF' : 'WebP',
			isLossless,
			processFunction: isAvif ? processAvif : processWebp,
			progressBar,
			progressBarContainer,
			planIndex,
			skipReason: operation.skipReason,
			totalSize,
		});
	})));

	progressBarContainer.update(); // Prevent logs lost. See: https://github.com/npkgz/cli-progress/issues/145#issuecomment-1859594159
	progressBarContainer.stop();

	showTotal(totalSize.before, totalSize.after, outcomes, { conversion: true });
	return { failed: outcomes.filter(outcome => outcome.status === OUTCOME_STATUS.FAILED).length, outcomes };
}

async function processFile({
	filePath,
	config,
	configPath,
	isLossless,
	progressBarContainer,
	progressBar,
	planIndex,
	totalSize,
	skipReason,
	format,
	processFunction,
}) {
	const outputFilePath = filePath.output;

	try {
		if (skipReason) {
			logProgressVerbose(getRelativePath(outputFilePath), {
				description: `File already exists, '${outputFilePath}'`,
				progressBarContainer,
			});

			return { planIndex, status: OUTCOME_STATUS.SKIPPED };
		}

		const fileBuffer = await fs.promises.readFile(filePath.input);
		const processedFileBuffer = await processFunction({ fileBuffer, config, configPath, isLossless });

		await atomicWrite(outputFilePath, processedFileBuffer);

		const fileSize = fileBuffer.length;
		const processedFileSize = processedFileBuffer.length;

		totalSize.before += fileSize;
		totalSize.after += Math.min(fileSize, processedFileSize);

		const ratio = calculateRatio(fileSize, processedFileSize);
		const before = formatBytes(fileSize);
		const after = formatBytes(processedFileSize);

		logProgress(getRelativePath(outputFilePath), {
			type: LOG_TYPES.SUCCESS,
			description: `${before} → ${format} ${after}. Ratio: ${ratio}%`,
			progressBarContainer,
		});
		return { after: processedFileSize, before: fileSize, planIndex, status: OUTCOME_STATUS.PROCESSED };
	} catch (error) {
		// Work abandoned during shutdown is left undone by the interruption, not failed.
		if (isInterrupted()) return { planIndex, status: OUTCOME_STATUS.UNSTARTED };
		return { error, output: outputFilePath, planIndex, status: OUTCOME_STATUS.FAILED };
	} finally {
		progressBar.increment();
	}
}

async function processAvif({ fileBuffer, config, configPath, isLossless }) {
	const imageMetadata = await parseImageMetadata(fileBuffer);
	checkImageFormat(imageMetadata.format);

	const isAnimated = imageMetadata.pages > 1;

	if (isAnimated) {
		throw new Error('Animated AVIF is not supported'); // See: https://github.com/strukturag/libheif/issues/377
	}

	// Only the codec call is enriched, so detection and support errors keep speaking for themselves.
	try {
		return await sharp(fileBuffer)
			.rotate() // Rotate image using information from EXIF Orientation tag
			.avif(config)
			.toBuffer();
	} catch (error) {
		throw describeCodecFailure({ configPath, error, format: 'avif', isLossless, mode: 'convert' });
	}
}

async function processWebp({ fileBuffer, config, configPath, isLossless }) {
	const imageMetadata = await parseImageMetadata(fileBuffer);
	checkImageFormat(imageMetadata.format);

	const isAnimated = imageMetadata.pages > 1;

	try {
		return await sharp(fileBuffer, { animated: isAnimated })
			.rotate() // Rotate image using information from EXIF Orientation tag
			.webp(config)
			.toBuffer();
	} catch (error) {
		throw describeCodecFailure({ configPath, error, format: 'webp', isLossless, mode: 'convert' });
	}
}

function checkImageFormat(imageFormat) {
	if (!imageFormat) {
		throw new Error('Unknown file format');
	}

	if (!SUPPORTED_FILE_TYPES.CONVERT.includes(imageFormat)) {
		throw new Error(`Unsupported image format: "${imageFormat}"`);
	}
}
