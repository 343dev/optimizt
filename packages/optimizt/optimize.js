import { spawn } from 'node:child_process';
import fs from 'node:fs/promises';
import path from 'node:path';

import { optimize as svgoOptimize } from 'svgo';

import { atomicWrite } from './lib/atomic-write.js';
import { calculateRatio } from './lib/calculate-ratio.js';
import { describeCodecFailure } from './lib/describe-codec-failure.js';
import { createGifOperation } from './lib/gifsicle.js';
import { guetzliRunner, nodeExecutable } from './lib/guetzli.js';
import { createOperationRuntime } from './lib/operation-runtime.js';
import { optionsToArguments } from './lib/options-to-arguments.js';
import { parseImageMetadata } from './lib/parse-image-metadata.js';
import sharp from './lib/sharp.js';

export async function optimize({ operations, config, configPath, lifecycle, options, reporter }) {
	const runtime = createOperationRuntime({
		detect: (_operation, input) => parseImageMetadata(input),
		lifecycle,
		read: operation => fs.readFile(operation.input),
		writer: { write: atomicWrite },
	});
	return runtime.execute({
		onCompleted: reporter.operationCompleted,
		operations,
		policy: {
			complete({ encoded, input, metadata }) {
				const ratio = calculateRatio(input.length, encoded.length);
				const isChanged = !input.equals(encoded);
				const isWrite = ratio > 0 || (metadata.format === 'svg' && isChanged);
				return { before: input.length, after: isWrite ? encoded.length : input.length, ratio, write: isWrite }; // eslint-disable-line unicorn/prefer-minimal-ternary
			},
		},
		selectCodec(metadata, operation) {
			const codec = CODECS.get(metadata.format);
			if (!metadata.format) throw new Error('Unable to read the image format. Check that the file is a valid, supported image.');
			if (!codec) throw new Error(`Unsupported image format: "${metadata.format}"`);
			return {
				resource: ['.jpg', '.jpeg'].includes(path.extname(operation.input).toLowerCase()) && options.isLossless ? 'guetzli' : undefined,
				async encode(input) {
					try {
						return await codec({ config, input, isLossless: options.isLossless, lifecycle });
					} catch (error) {
						throw describeCodecFailure({ configPath, error, format: metadata.format, isLossless: options.isLossless, mode: 'optimize' });
					}
				},
			};
		},
	});
}

const CODECS = new Map([
	['gif', ({ config, input, isLossless, lifecycle }) => {
		const operation = createGifOperation(input, (isLossless ? config?.gif?.lossless : config?.gif?.lossy) || {});
		lifecycle.registerCancellable(operation.terminate, operation.promise);
		return operation.promise;
	}],
	['jpeg', async ({ config, input, isLossless, lifecycle }) => {
		const image = sharp(input).rotate();
		if (!isLossless) return image.jpeg(config?.jpeg?.lossy || {}).toBuffer();
		const prepared = await image.toColorspace('srgb').jpeg({ quality: 100, optimizeCoding: false }).toBuffer();
		return encodeWithGuetzli(prepared, config?.jpeg?.lossless || {}, lifecycle);
	}],
	['png', ({ config, input, isLossless }) => sharp(input).png(isLossless ? config?.png?.lossless : config?.png?.lossy || {}).toBuffer()],
	['svg', ({ config, input }) => Buffer.from(svgoOptimize(input, config.svg).data)],
]);

function encodeWithGuetzli(input, options, lifecycle) {
	return new Promise((resolve, reject) => {
		const child = spawn(nodeExecutable, [guetzliRunner, ...optionsToArguments({ options })]);
		lifecycle.registerChild(child);
		child.stdin.end(input);
		const stdout = [];
		child.stdout.on('data', (chunk) => {
			stdout.push(chunk);
		});
		child.on('error', error => reject(new Error(`Unable to optimize the image: ${error.message}`)));
		child.on('close', (code) => {
			if (code !== 0) {
				reject(new Error(`Unable to optimize the image. The encoder exited with code ${code}.`));
				return;
			}
			resolve(Buffer.concat(stdout));
		});
	});
}
