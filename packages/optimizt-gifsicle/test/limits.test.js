import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

import optimize, { errorCodes } from '../index.js';

const fixtureUrl = new URL('fixtures/animated.gif', import.meta.url);

async function expectInvalid(input) {
	await assert.rejects(optimize(input), (error) => {
		assert.equal(error.code, errorCodes.INVALID_INPUT);
		return true;
	});
}

test('rejects excessive logical canvas area during parsing', async () => {
	const input = Buffer.from(await readFile(fixtureUrl));
	input.writeUInt16LE(0xFF_FF, 6);
	input.writeUInt16LE(0xFF_FF, 8);
	await expectInvalid(input);
});

test('rejects excessive total frame area during parsing', async () => {
	const input = Buffer.from(await readFile(fixtureUrl));
	const imageSeparator = input.indexOf(0x2C, 13);
	assert.notEqual(imageSeparator, -1);
	input.writeUInt16LE(0xFF_FF, imageSeparator + 5);
	input.writeUInt16LE(0xFF_FF, imageSeparator + 7);
	await expectInvalid(input);
});

test('accepts logical-canvas and cumulative-frame-area boundaries', async () => {
	const base = await readFile(new URL('fixtures/megapixel.gif', import.meta.url));
	const imageSeparator = base.indexOf(0x2C, 20);
	assert.notEqual(imageSeparator, -1);
	const header = Buffer.from(base.subarray(0, imageSeparator));
	const frame = base.subarray(imageSeparator, -1);

	header.writeUInt16LE(16_384, 6);
	header.writeUInt16LE(8192, 8);
	const maximumCanvasGif = Buffer.concat([
		header,
		frame,
		Buffer.from([0x3B]),
	]);
	assert.ok(await optimize(maximumCanvasGif) instanceof Buffer);

	const originalHeader = base.subarray(0, imageSeparator);
	const frames = Array.from({ length: 128 }, () => frame);
	const maximumFrameAreaGif = Buffer.concat([
		originalHeader,
		...frames,
		Buffer.from([0x3B]),
	]);
	assert.ok(await optimize(maximumFrameAreaGif) instanceof Buffer);
});

test('rejects the 100,001st frame while accepting 100,000 small frames', {
	timeout: 120_000,
}, async () => {
	const onePixelFrame = Buffer.from([
		0x2C, 0, 0, 0, 0, 1, 0, 1, 0, 0,
		2, 2, 0x44, 1, 0,
	]);
	const header = Buffer.from([
		...Buffer.from('GIF89a'),
		1, 0, 1, 0, 0x80, 0, 0,
		0, 0, 0, 0xFF, 0xFF, 0xFF,
	]);
	const frames = Array.from({ length: 100_000 }, () => onePixelFrame);
	const atLimit = Buffer.concat([header, ...frames, Buffer.from([0x3B])]);
	assert.ok(await optimize(atLimit) instanceof Buffer);
	await expectInvalid(Buffer.concat([
		header,
		...frames,
		onePixelFrame,
		Buffer.from([0x3B]),
	]));
});

test('returns recovered output for trailing garbage', async () => {
	const input = await readFile(
		new URL('fixtures/recoverable-trailing-garbage.gif', import.meta.url),
	);
	const output = await optimize(input);
	assert.ok(output instanceof Buffer);
	assert.ok(output.length < input.length);
	assert.match(output.subarray(0, 6).toString(), /^GIF8[79]a$/);
});
