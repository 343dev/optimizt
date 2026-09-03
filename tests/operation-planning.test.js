import fs from 'node:fs/promises';
import path from 'node:path';

import { afterEach, describe, expect, test } from 'vitest';

import {
	copyFixture,
	fileSize,
	isPrivileged,
	isWindows,
	makeTemporaryDirectory,
	removeTemporaryDirectories,
	runCli,
} from './helpers/cli.js';

afterEach(removeTemporaryDirectories);

describe('eligibility', () => {
	test('an explicit file with an unsupported extension fails', async () => {
		const directory = await makeTemporaryDirectory();
		const notAnImage = path.join(directory, 'notes.txt');
		await fs.writeFile(notAnImage, 'text');

		const result = await runCli([notAnImage]);

		expect(result.code).toBe(1);
		expect(result.stderr).toContain(`Unsupported explicit file: ${notAnImage}`);
	});

	test('unsupported files discovered inside a directory are ignored', async () => {
		const directory = await makeTemporaryDirectory();
		await copyFixture(directory, 'png-not-optimized.png');
		await fs.writeFile(path.join(directory, 'notes.txt'), 'text');

		const result = await runCli([directory]);

		expect(result.code).toBe(0);
		expect(result.stderr).toContain('Optimizing 1 image');
		expect(result.stderr).toContain('1 processed, 0 skipped, 0 failed');
	});

	test('an explicit file that cannot be converted fails before processing', async () => {
		const directory = await makeTemporaryDirectory();
		const svgPath = await copyFixture(directory, 'svg-not-optimized.svg');

		const result = await runCli(['--webp', svgPath]);

		expect(result.code).toBe(1);
		expect(result.stderr).toContain(`Unsupported explicit file: ${svgPath}`);
	});

	test.skipIf(isWindows || isPrivileged)('an incomplete directory traversal fails before any image changes', async () => {
		const directory = await makeTemporaryDirectory();
		const imagePath = await copyFixture(directory, 'png-not-optimized.png');
		const deniedPath = path.join(directory, 'denied');
		await fs.mkdir(deniedPath);
		await copyFixture(deniedPath, 'png-not-optimized.png', 'hidden.png');
		await fs.chmod(deniedPath, 0o000);
		const sizeBefore = await fileSize(imagePath);

		try {
			const result = await runCli([directory]);

			expect(result.code).toBe(1);
			expect(result.stderr).toContain(`Cannot traverse directory ${deniedPath}`);
			await expect(fileSize(imagePath)).resolves.toBe(sizeBefore);
		} finally {
			await fs.chmod(deniedPath, 0o755);
		}
	});
});

describe('operand normalization', () => {
	test('equivalent operands are processed once', async () => {
		const directory = await makeTemporaryDirectory();
		const imagePath = await copyFixture(directory, 'png-not-optimized.png');
		const spelledThroughParent = path.join(directory, 'nested', '..', 'png-not-optimized.png');
		await fs.mkdir(path.join(directory, 'nested'));

		const result = await runCli(['--verbose', directory, imagePath, spelledThroughParent]);

		expect(result.code).toBe(0);
		expect(result.stderr).toContain('Optimizing 1 image');
		expect(result.stderr).toContain('1 processed, 0 skipped, 0 failed');
	});

	test('overlapping directory operands are deduplicated when processing in place', async () => {
		const directory = await makeTemporaryDirectory();
		const nested = path.join(directory, 'nested');
		await fs.mkdir(nested);
		await copyFixture(directory, 'png-not-optimized.png', 'top.png');
		await copyFixture(nested, 'png-not-optimized.png', 'deep.png');

		const result = await runCli([directory, nested]);

		expect(result.code).toBe(0);
		expect(result.stderr).toContain('Optimizing 2 images');
		expect(result.stderr).toContain('2 processed, 0 skipped, 0 failed');
	});
});

describe('output mapping', () => {
	test('nested directory contents are mapped under an existing output root', async () => {
		const directory = await makeTemporaryDirectory();
		const input = path.join(directory, 'input');
		const output = path.join(directory, 'output');
		await fs.mkdir(output);
		await copyFixture(input, 'png-not-optimized.png', path.join('nested', 'picture.png'));

		const result = await runCli(['--output', output, input]);

		expect(result.code).toBe(0);
		expect(await exists(path.join(output, 'nested', 'picture.png'))).toBe(true);
	});

	test('several directory operands map directly into one output root', async () => {
		const directory = await makeTemporaryDirectory();
		const output = path.join(directory, 'output');
		await fs.mkdir(output);
		await copyFixture(directory, 'png-not-optimized.png', path.join('first', 'one.png'));
		await copyFixture(directory, 'png-not-optimized.png', path.join('second', 'two.png'));

		const result = await runCli(['--output', output, path.join(directory, 'first'), path.join(directory, 'second')]);

		expect(result.code).toBe(0);
		expect(await exists(path.join(output, 'one.png'))).toBe(true);
		expect(await exists(path.join(output, 'two.png'))).toBe(true);
	});

	test('a missing output root fails preflight instead of being created', async () => {
		const directory = await makeTemporaryDirectory();
		const imagePath = await copyFixture(directory, 'png-not-optimized.png');
		const output = path.join(directory, 'output');

		const result = await runCli(['--output', output, imagePath]);

		expect(result.code).toBe(1);
		expect(result.stderr).toContain(`Output path does not exist or is inaccessible: ${output}`);
		expect(await exists(output)).toBe(false);
	});

	test('an output root that is not a directory fails preflight', async () => {
		const directory = await makeTemporaryDirectory();
		const imagePath = await copyFixture(directory, 'png-not-optimized.png');
		const outputPath = path.join(directory, 'output.txt');
		await fs.writeFile(outputPath, 'not a directory');

		const result = await runCli(['--output', outputPath, imagePath]);

		expect(result.code).toBe(1);
		expect(result.stderr).toContain(`Output path is not a directory: ${outputPath}`);
	});
});

describe('collisions', () => {
	test('two inputs mapping to one output are rejected before any write', async () => {
		const directory = await makeTemporaryDirectory();
		const output = path.join(directory, 'output');
		await fs.mkdir(output);
		await copyFixture(directory, 'png-not-optimized.png', path.join('first', 'same.png'));
		await copyFixture(directory, 'png-not-optimized.png', path.join('second', 'same.png'));

		const result = await runCli(['--output', output, path.join(directory, 'first'), path.join(directory, 'second')]);

		expect(result.code).toBe(1);
		expect(result.stderr).toContain('Output collision');
		expect(await fs.readdir(output)).toEqual([]);
	});

	test('overlapping directory operands are rejected with an output root', async () => {
		const directory = await makeTemporaryDirectory();
		const output = path.join(directory, 'output');
		const input = path.join(directory, 'input');
		await fs.mkdir(output);
		await copyFixture(input, 'png-not-optimized.png', path.join('nested', 'picture.png'));

		const result = await runCli(['--output', output, input, path.join(input, 'nested')]);

		expect(result.code).toBe(1);
		expect(result.stderr).toContain('Overlapping directory operands cannot be used with --output');
		expect(await fs.readdir(output)).toEqual([]);
	});
});

describe('generated names', () => {
	test('an invalid generated name is rejected rather than sanitized', async () => {
		const directory = await makeTemporaryDirectory();
		const imagePath = await copyFixture(directory, 'png-not-optimized.png');
		const output = path.join(directory, 'output');
		await fs.mkdir(output);

		const result = await runCli(['--prefix', '<unsafe>', '--output', output, imagePath]);

		expect(result.code).toBe(1);
		expect(result.stderr).toContain('not portable');
		expect(await fs.readdir(output)).toEqual([]);
	});

	test.each([
		['--prefix', 'Prefix'],
		['--suffix', 'Suffix'],
	])('%s containing a path separator is rejected', async (option, label) => {
		const directory = await makeTemporaryDirectory();
		const imagePath = await copyFixture(directory, 'png-not-optimized.png');

		const result = await runCli([option, `nested${path.sep}part`, imagePath]);

		expect(result.code).toBe(1);
		expect(result.stderr).toContain(`${label} must not contain path separators or NUL`);
	});

	// Every basename this project rejects as non-portable is also unusable on Windows,
	// so only a POSIX filesystem can hold such an existing input.
	test.skipIf(isWindows)('an existing name that is not portable stays usable for in-place optimization', async () => {
		const directory = await makeTemporaryDirectory();
		const imagePath = await copyFixture(directory, 'png-not-optimized.png', 'question?.png');
		const sizeBefore = await fileSize(imagePath);

		const result = await runCli([imagePath]);

		expect(result.code).toBe(0);
		await expect(fileSize(imagePath)).resolves.toBeLessThan(sizeBefore);
	});
});

async function exists(targetPath) {
	try {
		await fs.stat(targetPath);
		return true;
	} catch {
		return false;
	}
}
