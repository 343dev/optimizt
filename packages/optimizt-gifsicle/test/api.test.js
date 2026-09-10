import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

import optimize, {
	createOperation,
	errorCodes,
	optimize as namedOptimize,
} from '../index.js';

const fixtureUrl = new URL('fixtures/animated.gif', import.meta.url);

function sha256(value) {
	return createHash('sha256').update(value).digest('hex');
}

async function expectCode(promise, code) {
	await assert.rejects(promise, (error) => {
		assert.equal(error.code, code);
		return true;
	});
}

test('exports an asynchronous optimizer and frozen error codes', async () => {
	assert.equal(namedOptimize, optimize);
	assert.ok(Object.isFrozen(errorCodes));
	const input = await readFile(fixtureUrl);
	const result = optimize(input);
	assert.ok(result instanceof Promise);
	assert.equal(
		sha256(await result),
		'0e79171206b236d2f3e3384616c85ae4e8775708020175dcef61e3dcf1d9edd8',
	);
});

test('snapshots selected Uint8Array bytes without modifying caller storage', async () => {
	const fixture = await readFile(fixtureUrl);
	const storage = Buffer.concat([Buffer.from('before'), fixture, Buffer.from('after')]);
	const view = new Uint8Array(storage.buffer, storage.byteOffset + 6, fixture.length);
	const promise = optimize(view, Object.create(null));
	view.fill(0);
	const output = await promise;

	assert.equal(
		sha256(output),
		'0e79171206b236d2f3e3384616c85ae4e8775708020175dcef61e3dcf1d9edd8',
	);
	assert.equal(storage.subarray(0, 6).toString(), 'before');
	assert.equal(storage.subarray(-5).toString(), 'after');
	assert.notEqual(output.buffer, view.buffer);
});

test('validates input and options with stable error codes', async () => {
	const fixture = await readFile(fixtureUrl);
	await expectCode(optimize('gif'), errorCodes.INVALID_INPUT);
	await expectCode(optimize(new Uint8Array()), errorCodes.INVALID_INPUT);
	await expectCode(optimize(fixture, 1), errorCodes.INVALID_OPTIONS);
	await expectCode(optimize(fixture, { unknown: true }), errorCodes.INVALID_OPTIONS);
	await expectCode(optimize(fixture, { optimize: true }), errorCodes.INVALID_OPTIONS);
	await expectCode(optimize(fixture, { optimize: 4 }), errorCodes.INVALID_OPTIONS);
	await expectCode(optimize(fixture, { careful: 1 }), errorCodes.INVALID_OPTIONS);
	await expectCode(optimize(fixture, { colors: 1 }), errorCodes.INVALID_OPTIONS);
	await expectCode(optimize(fixture, { lossy: -1 }), errorCodes.INVALID_OPTIONS);
	await expectCode(optimize(fixture, { gamma: 'SRGB' }), errorCodes.INVALID_OPTIONS);
	// eslint-disable-next-line unicorn/new-for-builtins
	const boxedNumber = new Number(1);
	await expectCode(
		optimize(fixture, { optimize: boxedNumber }),
		errorCodes.INVALID_OPTIONS,
	);
	await expectCode(optimize(fixture, { colors: 2.5 }), errorCodes.INVALID_OPTIONS);
	await expectCode(optimize(fixture, { lossy: Infinity }), errorCodes.INVALID_OPTIONS);
	await expectCode(optimize(fixture, { gamma: 0 }), errorCodes.INVALID_OPTIONS);
	await expectCode(optimize(fixture, { gamma: NaN }), errorCodes.INVALID_OPTIONS);
	await expectCode(optimize(fixture, []), errorCodes.INVALID_OPTIONS);
	await expectCode(optimize(fixture, new Date()), errorCodes.INVALID_OPTIONS);

	await optimize(fixture, {
		optimize: undefined,
		careful: undefined,
		colors: undefined,
		lossy: undefined,
		gamma: undefined,
	});
});

test('accepts exactly 128 MiB and rejects one byte more before Worker creation', {
	timeout: 30_000,
}, async () => {
	const fixture = await readFile(new URL('fixtures/single.gif', import.meta.url));
	const atLimit = Buffer.alloc(128 * 1024 * 1024);
	fixture.copy(atLimit);
	assert.ok(await optimize(atLimit) instanceof Buffer);

	const overLimit = Buffer.allocUnsafe(128 * 1024 * 1024 + 1);
	// Node marks this API experimental despite supporting it in every required release.
	// eslint-disable-next-line n/no-unsupported-features/node-builtins
	const before = process.getActiveResourcesInfo();
	await expectCode(optimize(overLimit), errorCodes.INVALID_INPUT);
	// eslint-disable-next-line n/no-unsupported-features/node-builtins
	assert.deepEqual(process.getActiveResourcesInfo(), before);
});

test('returns Gifsicle output even when it is larger than the input', async () => {
	const input = await readFile(fixtureUrl);
	const output = await optimize(input, { careful: true });
	assert.ok(output.length > input.length);
});

test('supports every setting and false disables optional settings', async () => {
	const fixture = await readFile(fixtureUrl);
	for (const options of [
		{ optimize: 0 },
		{ optimize: 1 },
		{ optimize: 2 },
		{ optimize: 3 },
		{ optimize: false },
		{ careful: true },
		{ careful: false },
		{ colors: 2 },
		{ colors: 256 },
		{ colors: false },
		{ lossy: 0 },
		{ lossy: 20 },
		{ lossy: 2_147_483_647 },
		{ lossy: false },
		{ gamma: 1 },
		{ gamma: 2.2 },
		{ gamma: 'srgb' },
		{ gamma: 'oklab' },
		{ gamma: false },
	]) {
		assert.ok(await optimize(fixture, options) instanceof Buffer);
	}
});

test('classifies malformed GIF input and recovers supported truncation', async () => {
	await expectCode(optimize(Buffer.from('not a gif')), errorCodes.INVALID_INPUT);

	const fixture = await readFile(fixtureUrl);
	await expectCode(optimize(fixture.subarray(0, 13)), errorCodes.INVALID_INPUT);
	await expectCode(optimize(fixture.subarray(0, -5)), errorCodes.INVALID_INPUT);

	const corruptCompressedData = Buffer.from(
		await readFile(new URL('fixtures/single.gif', import.meta.url)),
	);
	const imageSeparator = corruptCompressedData.indexOf(0x2C, 13);
	assert.notEqual(imageSeparator, -1);
	corruptCompressedData[imageSeparator + 10] = 13;
	await expectCode(optimize(corruptCompressedData), errorCodes.INVALID_INPUT);

	const recovered = await optimize(fixture.subarray(0, -1));
	assert.ok(recovered instanceof Buffer);
});

test('settles only after its Worker resource exits', async () => {
	const fixture = await readFile(fixtureUrl);
	const operation = optimize(fixture);
	// Node marks this API experimental despite supporting it in every required release.
	// eslint-disable-next-line n/no-unsupported-features/node-builtins
	assert.ok(process.getActiveResourcesInfo().includes('MessagePort'));
	await operation;
	// eslint-disable-next-line n/no-unsupported-features/node-builtins
	assert.ok(!process.getActiveResourcesInfo().includes('MessagePort'));
});

test('exposes a cancellable operation for the Optimizt lifecycle', async () => {
	const fixture = await readFile(fixtureUrl);
	const operation = createOperation(fixture, { optimize: 3 });
	await operation.terminate();
	await expectCode(operation.promise, errorCodes.WORKER_FAILED);
});

test('supports the Optimizt byte-API migration presets', async () => {
	const input = await readFile(fixtureUrl);
	for (const options of [
		{ optimize: 0, careful: true, colors: 256, lossy: 0, gamma: 1 },
		{ optimize: 3, careful: false, colors: 256, lossy: 100, gamma: 1 },
	]) {
		const output = await optimize(input, options);
		assert.ok(Buffer.isBuffer(output));
	}
});

test('supports concurrent isolated optimizations', async () => {
	const fixture = await readFile(fixtureUrl);
	const [levelOne, levelThree] = await Promise.all([
		optimize(fixture, { optimize: 1 }),
		optimize(fixture, { optimize: 3 }),
	]);
	assert.ok(levelOne instanceof Buffer);
	assert.ok(levelThree instanceof Buffer);
	assert.notEqual(sha256(levelOne), sha256(levelThree));
});
