import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import process from 'node:process';
import { promisify } from 'node:util';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

import { nativeLauncher } from '../scripts/native-reference.js';

const execFileAsync = promisify(execFile);

async function withLauncher(value, operation) {
	const previous = process.env.GIFSICLE_NATIVE_LAUNCHER;
	try {
		if (value === undefined) {
			delete process.env.GIFSICLE_NATIVE_LAUNCHER;
		} else {
			process.env.GIFSICLE_NATIVE_LAUNCHER = value;
		}
		return await operation();
	} finally {
		if (previous === undefined) {
			delete process.env.GIFSICLE_NATIVE_LAUNCHER;
		} else {
			process.env.GIFSICLE_NATIVE_LAUNCHER = previous;
		}
	}
}

test('nativeLauncher reports malformed JSON as a configuration error', async () => {
	for (const value of ['not-json', '[]', '[1]']) {
		await withLauncher(value, () => {
			assert.throws(
				() => nativeLauncher(),
				/GIFSICLE_NATIVE_LAUNCHER must be a nonempty JSON array of strings/,
			);
		});
	}
});

test('runNative returns stdout and forwards stderr', async () => {
	const child = [
		'process.stdout.write("native output");',
		'process.stderr.write("native diagnostic");',
	].join('');
	const probe = [
		'import { runNative } from "./scripts/native-reference.js";',
		`const output = await runNative(process.execPath, [], ["--eval", ${JSON.stringify(child)}]);`,
		'process.stdout.write(`returned:${output}`);',
	].join('\n');
	const { stdout, stderr } = await execFileAsync(
		process.execPath,
		['--input-type=module', '--eval', probe],
		{ cwd: fileURLToPath(new URL('../', import.meta.url)) },
	);
	assert.equal(stdout, 'returned:native output');
	assert.equal(stderr, 'native diagnostic');
});
