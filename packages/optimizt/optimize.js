import { spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import pLimit from 'p-limit';
import { optimize as svgoOptimize } from 'svgo';

import { atomicWrite } from './lib/atomic-write.js';
import { guetzliRunner, nodeExecutable } from './lib/guetzli.js';
import { calculateRatio } from './lib/calculate-ratio.js';
import { createProgressBarContainer } from './lib/create-progress-bar-container.js';
import { describeCodecFailure } from './lib/describe-codec-failure.js';
import { formatBytes } from './lib/format-bytes.js';
import { createGifOperation } from './lib/gifsicle.js';
import { getPlural } from './lib/get-plural.js';
import { getRelativePath } from './lib/get-relative-path.js';
import { isInterrupted, registerCancellable, registerChild } from './lib/lifecycle.js';
import sharp from './lib/sharp.js';
import {
	LOG_TYPES,
	log,
	logProgress,
	logProgressVerbose,
} from './lib/log.js';
import { optionsToArguments } from './lib/options-to-arguments.js';
import { OUTCOME_STATUS } from './lib/outcome-status.js';
import { parseImageMetadata } from './lib/parse-image-metadata.js';
import { programOptions } from './lib/program-options.js';
import { showTotal } from './lib/show-total.js';

export async function optimize({ operations, config, configPath }) {
	const { isLossless } = programOptions;
	const filePaths = operations.map(operation => ({ input: operation.input, output: operation.output }));

	const filePathsCount = filePaths.length;

	if (filePathsCount <= 0) {
		return;
	}

	log(`Optimizing ${filePathsCount} ${getPlural(filePathsCount, 'image', 'images')} (${isLossless ? 'lossless' : 'lossy'})...`);

	const progressBarContainer = createProgressBarContainer(filePathsCount);
	const progressBar = progressBarContainer.create(filePathsCount, 0);

	const totalSize = { before: 0, after: 0 };

	const cpuCount = os.cpus().length;
	const tasksSimultaneousLimit = pLimit(cpuCount);
	const guetzliTasksSimultaneousLimit = pLimit(1); // Guetzli uses a large amount of memory and a significant amount of CPU time. To reduce system load, we only allow one instance of guetzli to run at the same time.

	const outcomes = await Promise.all(
		filePaths.map((filePath, planIndex) => {
			const extension = path.extname(filePath.input).toLowerCase();
			const isJpeg = extension === '.jpg' || extension === '.jpeg';

			const limit = isJpeg && isLossless
				? guetzliTasksSimultaneousLimit
				: tasksSimultaneousLimit;

			return limit(() => isInterrupted()
				? { planIndex, status: OUTCOME_STATUS.UNSTARTED }
				: processFile({
					filePath,
					config,
					configPath,
					progressBarContainer,
					progressBar,
					totalSize,
					isLossless,
					planIndex,
				}));
		}),
	);

	progressBarContainer.update(); // Prevent logs lost. See: https://github.com/npkgz/cli-progress/issues/145#issuecomment-1859594159
	progressBarContainer.stop();

	showTotal(totalSize.before, totalSize.after, outcomes);
	return { failed: outcomes.filter(outcome => outcome.status === OUTCOME_STATUS.FAILED).length, outcomes };
}

async function processFile({
	filePath,
	config,
	configPath,
	progressBarContainer,
	progressBar,
	totalSize,
	isLossless,
	planIndex,
}) {
	try {
		const fileBuffer = await fs.promises.readFile(filePath.input);
		const processedFileBuffer = await processFileByFormat({ fileBuffer, config, configPath, isLossless });

		const fileSize = fileBuffer.length;
		const processedFileSize = processedFileBuffer.length;

		totalSize.before += fileSize;
		totalSize.after += Math.min(fileSize, processedFileSize);

		const ratio = calculateRatio(fileSize, processedFileSize);

		const isOptimized = ratio > 0;
		const isChanged = !fileBuffer.equals(processedFileBuffer);
		const isSvg = path.extname(filePath.input).toLowerCase() === '.svg';

		if (!isOptimized && (!isChanged || !isSvg)) {
			logProgressVerbose(getRelativePath(filePath.output), {
				description: `${(isChanged ? 'File size increased' : 'Nothing changed')}. Skipped`,
				progressBarContainer,
			});

			return { planIndex, status: OUTCOME_STATUS.SKIPPED };
		}

		await atomicWrite(filePath.output, processedFileBuffer);

		const before = formatBytes(fileSize);
		const after = formatBytes(processedFileSize);

		logProgress(getRelativePath(filePath.output), {
			type: isOptimized ? LOG_TYPES.SUCCESS : LOG_TYPES.WARNING,
			description: `${before} → ${after}. Ratio: ${ratio}%`,
			progressBarContainer,
		});
		return { after: processedFileSize, before: fileSize, planIndex, status: OUTCOME_STATUS.PROCESSED };
	} catch (error) {
		// Work abandoned during shutdown is left undone by the interruption, not failed.
		if (isInterrupted()) return { planIndex, status: OUTCOME_STATUS.UNSTARTED };
		return { error, output: filePath.output, planIndex, status: OUTCOME_STATUS.FAILED };
	} finally {
		progressBar.increment();
	}
}

async function processFileByFormat({ fileBuffer, config, configPath, isLossless }) {
	const imageMetadata = await parseImageMetadata(fileBuffer);
	const format = imageMetadata.format;

	if (!format) {
		throw new Error('Unknown file format');
	}

	const processByFormat = PROCESS_BY_FORMAT.get(format);
	if (!processByFormat) {
		throw new Error(`Unsupported image format: "${format}"`);
	}

	// Only the codec call is enriched, so filesystem and detection errors keep speaking
	// for themselves.
	try {
		return await processByFormat({ fileBuffer, config, isLossless });
	} catch (error) {
		throw describeCodecFailure({ configPath, error, format, isLossless, mode: 'optimize' });
	}
}

const PROCESS_BY_FORMAT = new Map([
	['gif', processGif],
	['jpeg', processJpeg],
	['png', processPng],
	['svg', processSvg],
]);

async function processJpeg({ fileBuffer, config, isLossless }) {
	const sharpImage = sharp(fileBuffer)
		.rotate(); // Rotate image using information from EXIF Orientation tag

	if (!isLossless) {
		return sharpImage
			.jpeg(config?.jpeg?.lossy || {})
			.toBuffer();
	}

	const inputBuffer = await sharpImage
		.toColorspace('srgb') // Replace colorspace (guetzli works only with sRGB)
		.jpeg({ quality: 100, optimizeCoding: false }) // Applying maximum quality to minimize losses during image processing with sharp
		.toBuffer();

	const commandOptions = [
		guetzliRunner,
		...optionsToArguments({
			options: config?.jpeg?.lossless || {},
		}),
	];

	return pipe({
		command: nodeExecutable,
		commandOptions,
		inputBuffer,
	});
}

function processPng({ fileBuffer, config, isLossless }) {
	return sharp(fileBuffer)
		.png(isLossless ? config?.png?.lossless : config?.png?.lossy || {})
		.toBuffer();
}

function processGif({ fileBuffer, config, isLossless }) {
	const operation = createGifOperation(
		fileBuffer,
		(isLossless ? config?.gif?.lossless : config?.gif?.lossy) || {},
	);
	registerCancellable(operation.terminate, operation.promise);
	return operation.promise;
}

function processSvg({ fileBuffer, config }) {
	return Buffer.from(
		svgoOptimize(
			fileBuffer,
			config.svg,
		).data,
	);
}

function pipe({ command, commandOptions, inputBuffer }) {
	return new Promise((resolve, reject) => {
		const process = spawn(command, commandOptions);
		registerChild(process);

		process.stdin.write(inputBuffer);
		process.stdin.end();

		const stdoutChunks = [];
		process.stdout.on('data', (chunk) => {
			stdoutChunks.push(chunk);
		});

		process.on('error', (error) => {
			reject(new Error(`Error processing image: ${error.message}`));
		});

		process.on('close', (code) => {
			if (code !== 0) {
				reject(new Error(`Image optimization process exited with code ${code}`));
				return;
			}

			const processedFileBuffer = Buffer.concat(stdoutChunks);
			resolve(processedFileBuffer);
		});
	});
}
