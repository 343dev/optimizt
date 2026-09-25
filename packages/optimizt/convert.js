import fs from 'node:fs/promises';

import { atomicWrite } from './lib/atomic-write.js';
import { calculateRatio } from './lib/calculate-ratio.js';
import { SUPPORTED_FILE_TYPES } from './lib/constants.js';
import { describeCodecFailure } from './lib/describe-codec-failure.js';
import { createOperationRuntime } from './lib/operation-runtime.js';
import { parseImageMetadata } from './lib/parse-image-metadata.js';
import sharp from './lib/sharp.js';

export async function convert({ operations, config, configPath, lifecycle, options, reporter }) {
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
			complete({ encoded, input }) {
				return { after: encoded.length, before: input.length, ratio: calculateRatio(input.length, encoded.length), write: true };
			},
		},
		selectCodec(metadata, operation) {
			if (!metadata.format) throw new Error('Unable to read the image format. Check that the file is a valid, supported image.');
			if (!SUPPORTED_FILE_TYPES.CONVERT.includes(metadata.format)) throw new Error(`Unsupported image format: "${metadata.format}"`);
			return { encode: input => encode(input, metadata, operation.format) };
		},
	});

	async function encode(input, metadata, format) {
		if (format === 'avif' && metadata.pages > 1) throw new Error('Unable to create an animated AVIF. Use WebP or provide a non-animated image.');
		const codecConfig = config?.[format]?.[options.isLossless ? 'lossless' : 'lossy'] || {};
		try {
			const image = sharp(input, { animated: format === 'webp' && metadata.pages > 1 }).rotate();
			return await image[format](codecConfig).toBuffer();
		} catch (error) {
			throw describeCodecFailure({ configPath, error, format, isLossless: options.isLossless, mode: 'convert' });
		}
	}
}
