import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

import createModule from '../dist/guetzli.mjs';
import manifest from './parity-manifest.json' with { type: 'json' };

function sha256(value) {
	return createHash('sha256').update(value).digest('hex');
}

async function encode(module, input, quality) {
	const inputPointer = module._malloc(input.byteLength);
	assert.notEqual(inputPointer, 0);
	try {
		module.HEAPU8.set(input, inputPointer);
		assert.equal(module._guetzli_encode(inputPointer, input.byteLength, quality), 0);
	} finally {
		module._free(inputPointer);
	}
	const outputPointer = module._guetzli_output_data();
	const outputSize = module._guetzli_output_size();
	return Buffer.from(module.HEAPU8.subarray(outputPointer, outputPointer + outputSize));
}

test('clears output after a failed encoding', async () => {
	const module = await createModule();
	const input = await readFile(new URL('fixtures/rgb-444.jpg', import.meta.url));
	await encode(module, input, 95);

	const invalid = await readFile(new URL('fixtures/invalid.jpg', import.meta.url));
	const inputPointer = module._malloc(invalid.byteLength);
	assert.notEqual(inputPointer, 0);
	try {
		module.HEAPU8.set(invalid, inputPointer);
		assert.notEqual(module._guetzli_encode(inputPointer, invalid.byteLength, 95), 0);
	} finally {
		module._free(inputPointer);
	}
	assert.equal(module._guetzli_output_size(), 0);
});

for (const [fixture, qualities] of Object.entries(manifest.cases)) {
	test(`matches the native reference for ${fixture}`, async () => {
		const module = await createModule();
		const input = await readFile(new URL(`fixtures/${fixture}`, import.meta.url));
		for (const [qualityText, expectation] of Object.entries(qualities)) {
			const quality = Number(qualityText);
			const output = await encode(module, input, quality);
			if (expectation.parity === 'byte') {
				assert.equal(output.length, expectation.size, `quality ${quality} size`);
				assert.equal(sha256(output), expectation.sha256, `quality ${quality} hash`);
				continue;
			}

			assert.equal(expectation.parity, 'equivalent');
			assert.equal(sha256(input), expectation.inputSha256);
			assert.equal(output.length, expectation.wasmSize);
			assert.equal(sha256(output), expectation.wasmSha256);
		}
	});
}
