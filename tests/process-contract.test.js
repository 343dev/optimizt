import { spawn } from 'node:child_process';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { afterEach, describe, expect, test } from 'vitest';

const dirname = path.dirname(fileURLToPath(import.meta.url));
const cliPath = path.resolve('cli.js');
const fixturePath = path.join(dirname, 'images', 'png-not-optimized.png');
const temporaryDirectories = [];

afterEach(async () => {
	await Promise.all(temporaryDirectories.map(directory => fs.rm(directory, { force: true, recursive: true })));
	temporaryDirectories.length = 0;
});

describe('process contract', () => {
	test('bare invocation prints help to stdout and succeeds', async () => {
		const result = await runCli([]);

		expect(result.code).toBe(0);
		expect(result.stdout).toContain('Usage:');
		expect(result.stderr).toBe('');
	});

	test('missing explicit operand fails without stdout output', async () => {
		const result = await runCli(['/definitely/missing/image.png']);

		expect(result.code).toBe(1);
		expect(result.stdout).toBe('');
		expect(result.stderr).toContain('does not exist');
	});

	test('successful processing uses stderr and leaves stdout empty', async () => {
		const directory = await makeTemporaryDirectory();
		const imagePath = path.join(directory, 'image with spaces.png');
		await fs.copyFile(fixturePath, imagePath);

		const result = await runCli([imagePath]);

		expect(result.code).toBe(0);
		expect(result.stdout).toBe('');
		expect(result.stderr).toContain('Optimizing 1 image');
		expect(result.stderr).not.toContain('\u{1B}[');
	});

	test('a corrupt image makes the invocation fail while independent work succeeds', async () => {
		const directory = await makeTemporaryDirectory();
		const validPath = path.join(directory, 'valid.png');
		const corruptPath = path.join(directory, 'corrupt.png');
		await fs.copyFile(fixturePath, validPath);
		await fs.writeFile(corruptPath, 'not an image');
		const validBeforeStat = await fs.stat(validPath);
		const validBefore = validBeforeStat.size;

		const result = await runCli([corruptPath, validPath]);

		expect(result.code).toBe(1);
		expect(result.stdout).toBe('');
		expect(result.stderr).toContain('1 failed');
		const validAfter = await fs.stat(validPath);
		expect(validAfter.size).toBeLessThan(validBefore);
	});

	test('an empty directory is a successful no-op', async () => {
		const directory = await makeTemporaryDirectory();
		const result = await runCli([directory]);

		expect(result.code).toBe(0);
		expect(result.stdout).toBe('');
		expect(result.stderr).toContain('No eligible images found');
	});

	test('a missing explicit configuration is reported precisely', async () => {
		const directory = await makeTemporaryDirectory();
		const imagePath = path.join(directory, 'image.png');
		const configPath = path.join(directory, 'missing.cjs');
		await fs.copyFile(fixturePath, imagePath);

		const result = await runCli(['--config', configPath, imagePath]);

		expect(result.code).toBe(1);
		expect(result.stderr).toContain(`Config file does not exist: ${configPath}`);
		expect(result.stderr).not.toContain('Configuration file is invalid');
	});

	test('a non-file explicit configuration is reported precisely', async () => {
		const directory = await makeTemporaryDirectory();
		const imagePath = path.join(directory, 'image.png');
		await fs.copyFile(fixturePath, imagePath);

		const result = await runCli(['--config', directory, imagePath]);

		expect(result.code).toBe(1);
		expect(result.stderr).toContain(`Config path does not refer to a file: ${directory}`);
		expect(result.stderr).not.toContain('Configuration file is invalid');
	});

	test('an output root that is not a directory fails preflight', async () => {
		const directory = await makeTemporaryDirectory();
		const imagePath = path.join(directory, 'image.png');
		const outputPath = path.join(directory, 'output.txt');
		await fs.copyFile(fixturePath, imagePath);
		await fs.writeFile(outputPath, 'not a directory');

		const result = await runCli(['--output', outputPath, imagePath]);

		expect(result.code).toBe(1);
		expect(result.stderr).toContain(`Output path is not a directory: ${outputPath}`);
	});

	test('force is rejected outside conversion mode', async () => {
		const result = await runCli(['--force', '/unused']);

		expect(result.code).toBe(1);
		expect(result.stderr).toContain('--force requires --avif or --webp');
	});
});

async function makeTemporaryDirectory() {
	const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'optimizt-process-'));
	temporaryDirectories.push(directory);
	return directory;
}

function runCli(arguments_) {
	return new Promise((resolve, reject) => {
		const child = spawn(process.execPath, [cliPath, ...arguments_], {
			stdio: ['ignore', 'pipe', 'pipe'],
		});
		let stdout = '';
		let stderr = '';
		child.stdout.setEncoding('utf8').on('data', (chunk) => {
			stdout += chunk;
		});
		child.stderr.setEncoding('utf8').on('data', (chunk) => {
			stderr += chunk;
		});
		child.on('error', reject);
		child.on('close', (code, signal) => resolve({ code, signal, stderr, stdout }));
	});
}
