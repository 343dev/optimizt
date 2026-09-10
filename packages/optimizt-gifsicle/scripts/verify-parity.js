import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

import optimize from '../index.js';
import {
	nativeArguments,
	nativeLauncher,
	runNative,
} from './native-reference.js';

const root = fileURLToPath(new URL('../', import.meta.url));
const manifest = JSON.parse(await readFile(
	new URL('../verification/parity-manifest.json', import.meta.url),
	'utf8',
));
const nativeExecutable = process.env.GIFSICLE_NATIVE || path.join(
	root,
	'verification/gifsicle-native',
);
const launcher = nativeLauncher();

function sha256(bytes) {
	return createHash('sha256').update(bytes).digest('hex');
}

assert.equal(manifest.schemaVersion, 1);
const directory = await mkdtemp(path.join(tmpdir(), 'gifsicle-parity-'));
try {
	for (const [index, parityCase] of manifest.cases.entries()) {
		const fixture = path.join(root, 'test/fixtures', parityCase.fixture);
		const input = await readFile(fixture);
		assert.equal(sha256(input), parityCase.inputSha256, `${parityCase.fixture} input hash`);

		const nativePath = path.join(directory, `${index}.native.gif`);
		const arguments_ = nativeArguments(fixture, parityCase.options, nativePath);
		await runNative(nativeExecutable, launcher, arguments_);
		const native = await readFile(nativePath);
		const wasm = await optimize(input, parityCase.options);
		for (const [implementation, output, expected] of [
			['native', native, parityCase.native],
			['WebAssembly', wasm, parityCase.wasm],
		]) {
			assert.equal(output.length, expected.size, `${index} ${implementation} size`);
			assert.equal(sha256(output), expected.sha256, `${index} ${implementation} hash`);
		}
		assert.deepEqual(wasm, native, `${index} native/WebAssembly bytes`);
	}
} finally {
	await rm(directory, { force: true, recursive: true });
}

console.log(`Verified ${manifest.cases.length} native/WebAssembly parity cases.`);
