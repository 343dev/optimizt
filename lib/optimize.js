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
import getImageFormat from './get-image-format.js';
import getPlural from './get-plural.js';
import log from './log.js';
import optionsToArguments from './options-to-arguments.js';
import prepareWriteFilePath from './prepare-write-file-path.js';
import showTotal from './show-total.js';

export default async function optimize({ paths, lossless: isLossless, output, config }) {
	const totalPaths = paths.length;

	if (!totalPaths) {
		return;
	}

	log(`Optimizing ${totalPaths} ${getPlural(totalPaths, 'image', 'images')} (${isLossless ? 'lossless' : 'lossy'})...`);
	if (isLossless) {
		log('Lossless optimization may take a long time');
	}

	const progressBar = new CliProgress.SingleBar({
		format: `{bar} {percentage}% | Processed {value} of {total} ${getPlural(totalPaths, 'image', 'images')}`,
		clearOnComplete: true,
		stopOnComplete: true,
	}, CliProgress.Presets.shades_classic);

	progressBar.start(totalPaths, 0);

	const limit = pLimit(
		/*
      Guetzli uses a large amount of memory and a significant amount of CPU time.
      To reduce the processor load in lossless mode, we reduce the number
      of simultaneous tasks by half.
     */
		isLossless ? Math.round(os.cpus().length / 2) : os.cpus().length,
	);

	const tasksErrors = [];

	const tasks = paths.map(filePath => limit(() => fs.promises.readFile(filePath)
		.then(fileBuffer => optimizeByType({
			fileBuffer,
			filePath,
			isLossless,
			config,
		})))
		.then(fileBuffer => {
			progressBar.increment();
			return { fileBuffer, filePath };
		})
		.catch(error => {
			progressBar.increment();
			tasksErrors.push([filePath, {
				type: 'error',
				description: (error.message || '').trim(),
			}]);
		}));

	const totalSize = { before: 0, after: 0 };
	const tasksResult = await Promise.all(tasks);

	for (const { fileBuffer, filePath } of tasksResult.filter(Boolean)) {
		const fileSize = {
			before: fs.statSync(filePath).size,
			after: fileBuffer.length,
		};

		const isOptimized = fileSize.before > fileSize.after;

		totalSize.before += fileSize.before;
		totalSize.after += isOptimized ? fileSize.after : fileSize.before;

		checkResult(fileBuffer, filePath, fileSize, output);
	}

	for (const error of tasksErrors) {
		log(...error);
	}

	console.log();
	showTotal(totalSize.before, totalSize.after);
}

function checkResult(fileBuffer, filePath, fileSize, output) {
	if (!Buffer.isBuffer(fileBuffer) || typeof filePath !== 'string') {
		return;
	}

	const fileExtension = path.extname(filePath).toLowerCase();
	const before = formatBytes(fileSize.before);
	const after = formatBytes(fileSize.after);
	const ratio = calcRatio(fileSize.before, fileSize.after);
	const successMessage = `${before} → ${after}. Ratio: ${ratio}%`;

	const writeFilePath = prepareWriteFilePath(filePath, output);

	const isChanged = !fs.readFileSync(filePath).equals(fileBuffer);
	const isOptimized = ratio > 0;
	const isSvg = fileExtension === '.svg';

	if (isOptimized || (isChanged && isSvg)) {
		try {
			fs.writeFileSync(writeFilePath, fileBuffer);

			log(filePath, {
				type: isOptimized ? 'success' : 'warning',
				description: successMessage,
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

async function optimizeByType({ fileBuffer, filePath, isLossless, config }) {
	const fileExtension = path.extname(filePath).toLowerCase();
	const imageFormat = await getImageFormat(fileBuffer);

	switch (fileExtension) {
		case '.jpg':
		case '.jpeg': {
			if (imageFormat !== 'jpeg') {
				return fileBuffer;
			}

			return isLossless
				? execBuffer({
					bin: guetzli,
					args: [
						...optionsToArguments({
							options: config?.jpeg?.lossless || {},
						}),
						execBuffer.input,
						execBuffer.output,
					],
					input: await sharp(fileBuffer)
						.toColorspace('srgb') // Replace colorspace (guetzli works only with sRGB)
						.rotate() // Rotate image using information from EXIF Orientation tag
						.jpeg({ quality: 100, optimizeCoding: false }) // Applying maximum quality to minimize losses during image processing with sharp
						.toBuffer(),
				})
				: sharp(fileBuffer)
					.rotate() // Rotate image using information from EXIF Orientation tag
					.jpeg(config?.jpeg?.lossy || {})
					.toBuffer();
		}

		case '.png': {
			if (imageFormat !== 'png') {
				return fileBuffer;
			}

			return sharp(fileBuffer)
				.png((isLossless ? config?.png?.lossless : config?.png?.lossy) || {})
				.toBuffer();
		}

		case '.gif': {
			if (imageFormat !== 'gif') {
				return fileBuffer;
			}

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

		case '.svg': {
			if (imageFormat !== 'svg') {
				return fileBuffer;
			}

			return Buffer.from(
				svgoOptimize(
					fileBuffer,
					config.svg,
				).data,
			);
		}

		default: {
			throw new Error(`Unsupported file type: "${fileExtension}"`);
		}
	}
}
