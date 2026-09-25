import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

import { afterEach, describe, expect, test } from 'vitest';

import { encodeWithGuetzli } from '../lib/guetzli.js';

const directories = [];
afterEach(async () => {
	await Promise.all(directories.map(directory => fs.rm(directory, { force: true, recursive: true })));
	directories.length = 0;
});

const lifecycle = { registerChild() {} };

async function runner(source) {
	const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'optimizt-guetzli-'));
	directories.push(directory);
	const runnerPath = path.join(directory, 'runner.mjs');
	await fs.writeFile(runnerPath, source);
	return runnerPath;
}

describe('Guetzli adapter diagnostics', () => {
	test('distinguishes non-zero exit and preserves stderr', async () => {
		const runnerPath = await runner('process.stderr.write("precise reason"); process.exitCode = 7;');
		await expect(encodeWithGuetzli(Buffer.alloc(0), {}, lifecycle, { runner: runnerPath }))
			.rejects.toThrow('precise reason (exited with code 7)');
	});

	test('bounds verbose stderr and indicates truncation', async () => {
		const runnerPath = await runner('process.stderr.write("x".repeat(70000)); process.exitCode = 1;');
		let failure;
		try {
			await encodeWithGuetzli(Buffer.alloc(0), {}, lifecycle, { runner: runnerPath });
		} catch (error) {
			failure = error;
		}
		expect(failure.message).toContain('[stderr truncated]');
		expect(failure.message.length).toBeLessThan(66_000);
	});

	test('turns an early child exit while writing input into a codec failure', async () => {
		const runnerPath = await runner('process.exit(1);');
		const encoding = encodeWithGuetzli(Buffer.alloc(100 * 1024 * 1024), {}, lifecycle, { runner: runnerPath });
		await expect(encoding).rejects.toThrow('Guetzli failed (exited with code 1)');
	});

	test('distinguishes spawn failures', async () => {
		const missingCommand = path.join(os.tmpdir(), 'missing-node');
		const encoding = encodeWithGuetzli(Buffer.alloc(0), {}, lifecycle, { command: missingCommand });
		await expect(encoding).rejects.toThrow('Guetzli failed to start:');
	});
});
