import fs from 'node:fs/promises';
import path from 'node:path';

import { afterEach, describe, expect, test } from 'vitest';

import {
	copyFixture,
	fileSize,
	findTemporaryWriteLeftovers,
	isPrivileged,
	isWindows,
	makeTemporaryDirectory,
	removeTemporaryDirectories,
	runCli,
	summaryLine,
} from './helpers/cli.js';

afterEach(removeTemporaryDirectories);

describe('atomic replacement', () => {
	test('an existing target is replaced in place with its mode preserved', async () => {
		const directory = await makeTemporaryDirectory();
		const imagePath = await copyFixture(directory, 'png-not-optimized.png', 'image with spaces.png');
		const sizeBefore = await fileSize(imagePath);
		await fs.chmod(imagePath, 0o640);

		const result = await runCli([imagePath]);

		expect(result.code).toBe(0);
		expect(result.stdout).toBe('');
		expect(result.stderr).toContain(summaryLine('1 processed'));
		const after = await fs.stat(imagePath);
		expect(after.size).toBeLessThan(sizeBefore);
		expect(after.mode & 0o777).toBe(isWindows ? after.mode & 0o777 : 0o640);
		await expect(findTemporaryWriteLeftovers(directory)).resolves.toEqual([]);
	});

	test('conversion creates the selected variants without modifying the source', async () => {
		const directory = await makeTemporaryDirectory();
		const imagePath = await copyFixture(directory, 'png-not-optimized.png');
		const before = await fs.readFile(imagePath);

		const result = await runCli(['--avif', '--webp', imagePath]);

		expect(result.code).toBe(0);
		const source = await fs.readFile(imagePath);
		expect(source.equals(before)).toBe(true);
		expect(result.stderr).toContain(summaryLine('2 processed'));
		await expect(fileSize(path.join(directory, 'png-not-optimized.avif'))).resolves.toBeGreaterThan(0);
		await expect(fileSize(path.join(directory, 'png-not-optimized.webp'))).resolves.toBeGreaterThan(0);
		await expect(findTemporaryWriteLeftovers(directory)).resolves.toEqual([]);
	});

	test('an existing conversion target is kept unless force is selected', async () => {
		const directory = await makeTemporaryDirectory();
		const imagePath = await copyFixture(directory, 'png-not-optimized.png');
		const target = path.join(directory, 'png-not-optimized.webp');
		await fs.writeFile(target, 'existing');

		const skipped = await runCli(['--verbose', '--webp', imagePath]);
		expect(skipped.code).toBe(0);
		expect(skipped.stderr).toContain(summaryLine('1 skipped'));
		await expect(fs.readFile(target, 'utf8')).resolves.toBe('existing');

		const forced = await runCli(['--force', '--webp', imagePath]);
		expect(forced.code).toBe(0);
		await expect(fs.readFile(target, 'utf8')).resolves.not.toBe('existing');
	});

	test.skipIf(isWindows || isPrivileged)('a target survives a failing write and leaves no temporary file', async () => {
		const directory = await makeTemporaryDirectory();
		const readOnly = path.join(directory, 'read-only');
		const imagePath = await copyFixture(readOnly, 'png-not-optimized.png');
		const before = await fs.readFile(imagePath);
		await fs.chmod(readOnly, 0o555);

		try {
			const result = await runCli([imagePath]);

			expect(result.code).toBe(1);
			expect(result.stderr).toContain('1 failed');
			const current = await fs.readFile(imagePath);
			expect(current.equals(before)).toBe(true);
			await expect(findTemporaryWriteLeftovers(readOnly)).resolves.toEqual([]);
		} finally {
			await fs.chmod(readOnly, 0o755);
		}
	});

	test.skipIf(isWindows)('a multiply hard-linked target is not replaced', async () => {
		const directory = await makeTemporaryDirectory();
		const imagePath = await copyFixture(directory, 'png-not-optimized.png');
		const linkPath = path.join(directory, 'hard-link.png');
		await fs.link(imagePath, linkPath);
		const before = await fs.readFile(imagePath);

		const result = await runCli([imagePath]);

		expect(result.code).toBe(1);
		expect(result.stderr).toContain(`Refusing to replace multiply hard-linked file: ${imagePath}`);
		const current = await fs.readFile(imagePath);
		expect(current.equals(before)).toBe(true);
	});

	test.skipIf(isWindows)('a distinct output may be created from a hard-linked source', async () => {
		const directory = await makeTemporaryDirectory();
		const imagePath = await copyFixture(directory, 'png-not-optimized.png');
		await fs.link(imagePath, path.join(directory, 'hard-link.png'));

		const result = await runCli(['--webp', imagePath]);

		expect(result.code).toBe(0);
		await expect(fileSize(path.join(directory, 'png-not-optimized.webp'))).resolves.toBeGreaterThan(0);
	});
});

describe.skipIf(isWindows)('symbolic links', () => {
	test('optimizing an explicit symlink replaces the real target and keeps the link', async () => {
		const directory = await makeTemporaryDirectory();
		const realPath = await copyFixture(directory, 'png-not-optimized.png', 'real.png');
		const linkPath = path.join(directory, 'alias.png');
		await fs.symlink('real.png', linkPath);
		const sizeBefore = await fileSize(realPath);

		const result = await runCli([linkPath]);

		expect(result.code).toBe(0);
		const linkStat = await fs.lstat(linkPath);
		expect(linkStat.isSymbolicLink()).toBe(true);
		await expect(fileSize(realPath)).resolves.toBeLessThan(sizeBefore);
		await expect(findTemporaryWriteLeftovers(directory)).resolves.toEqual([]);
	});

	test('converting an explicit symlink places the variant beside the operand', async () => {
		const directory = await makeTemporaryDirectory();
		await copyFixture(directory, 'png-not-optimized.png', path.join('elsewhere', 'real.png'));
		const linkPath = path.join(directory, 'alias.png');
		await fs.symlink(path.join('elsewhere', 'real.png'), linkPath);

		const result = await runCli(['--webp', linkPath]);

		expect(result.code).toBe(0);
		await expect(fileSize(path.join(directory, 'alias.webp'))).resolves.toBeGreaterThan(0);
		await expect(fs.stat(path.join(directory, 'elsewhere', 'real.webp'))).rejects.toThrow();
	});

	test('recursive traversal does not follow symlinked directories', async () => {
		const directory = await makeTemporaryDirectory();
		await copyFixture(directory, 'png-not-optimized.png', path.join('real', 'picture.png'));
		await fs.symlink(path.join(directory, 'real'), path.join(directory, 'linked'));

		const result = await runCli([directory]);

		expect(result.code).toBe(0);
		expect(result.stderr).toContain('Optimizing 1 image');
		expect(result.stderr).toContain(summaryLine('1 processed'));
	});

	test('an existing conversion-output symlink is skipped without force', async () => {
		const directory = await makeTemporaryDirectory();
		const imagePath = await copyFixture(directory, 'png-not-optimized.png');
		const realTarget = path.join(directory, 'real.webp');
		await fs.writeFile(realTarget, 'existing');
		await fs.symlink('real.webp', path.join(directory, 'png-not-optimized.webp'));

		const skipped = await runCli(['--verbose', '--webp', imagePath]);
		expect(skipped.code).toBe(0);
		expect(skipped.stderr).toContain(summaryLine('1 skipped'));
		await expect(fs.readFile(realTarget, 'utf8')).resolves.toBe('existing');

		const forced = await runCli(['--force', '--webp', imagePath]);
		expect(forced.code).toBe(0);
		await expect(fs.readFile(realTarget, 'utf8')).resolves.not.toBe('existing');
	});

	test('forced replacement may not follow a symlink out of the output root', async () => {
		const directory = await makeTemporaryDirectory();
		const imagePath = await copyFixture(directory, 'png-not-optimized.png');
		const output = path.join(directory, 'output');
		const outside = path.join(directory, 'outside');
		await fs.mkdir(output);
		await fs.mkdir(outside);
		const escapeTarget = path.join(outside, 'escaped.webp');
		await fs.writeFile(escapeTarget, 'outside the root');
		await fs.symlink(escapeTarget, path.join(output, 'png-not-optimized.webp'));

		const result = await runCli(['--force', '--webp', '--output', output, imagePath]);

		expect(result.code).toBe(1);
		expect(result.stderr).toContain('Output escapes permitted root');
		await expect(fs.readFile(escapeTarget, 'utf8')).resolves.toBe('outside the root');
	});
});
