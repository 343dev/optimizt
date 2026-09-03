import fs from 'node:fs/promises';
import path from 'node:path';

import { afterEach, describe, expect, test } from 'vitest';

import {
	copyFixture,
	fileSize,
	makeTemporaryDirectory,
	removeTemporaryDirectories,
	runCli,
	summaryLine,
} from './helpers/cli.js';

afterEach(removeTemporaryDirectories);

describe('process contract', () => {
	test('bare invocation prints help to stdout and succeeds', async () => {
		const result = await runCli([]);

		expect(result.code).toBe(0);
		expect(result.stdout).toContain('Usage:');
		expect(result.stderr).toBe('');
	});

	test('help takes precedence over unrelated invalid arguments', async () => {
		const result = await runCli(['--help', '--unknown', '/missing']);

		expect(result.code).toBe(0);
		expect(result.stdout).toContain('Optimizes in place by default');
		expect(result.stderr).toBe('');
	});

	test('the version is printed to stdout', async () => {
		const result = await runCli(['--version']);

		expect(result.code).toBe(0);
		expect(result.stdout).toMatch(/^\d+\.\d+\.\d+\n?$/);
		expect(result.stderr).toBe('');
	});

	test('an unknown option fails without stdout output', async () => {
		const result = await runCli(['--nonsense', 'image.png']);

		expect(result.code).toBe(1);
		expect(result.stdout).toBe('');
		expect(result.stderr).toContain('unknown option \'--nonsense\'');
	});

	test('missing explicit operand fails without stdout output', async () => {
		const result = await runCli(['/definitely/missing/image.png']);

		expect(result.code).toBe(1);
		expect(result.stdout).toBe('');
		expect(result.stderr).toContain('does not exist');
	});

	test('successful processing uses stderr and leaves stdout empty', async () => {
		const directory = await makeTemporaryDirectory();
		const imagePath = await copyFixture(directory, 'png-not-optimized.png', 'image with spaces.png');

		const result = await runCli([imagePath]);

		expect(result.code).toBe(0);
		expect(result.stdout).toBe('');
		expect(result.stderr).toContain('Optimizing 1 image');
		expect(result.stderr).not.toContain('\u{1B}[');
	});

	test('an operand spelled with shell metacharacters is passed through as written', async () => {
		const directory = await makeTemporaryDirectory();
		const imagePath = await copyFixture(directory, 'png-not-optimized.png', 'name; $(echo x) & \'quoted\'.png');
		const sizeBefore = await fileSize(imagePath);

		const result = await runCli([imagePath]);

		expect(result.code).toBe(0);
		expect(result.stderr).toContain(summaryLine('1 processed'));
		await expect(fileSize(imagePath)).resolves.toBeLessThan(sizeBefore);
	});

	test('a leading-hyphen operand after -- is treated as a path', async () => {
		const directory = await makeTemporaryDirectory();
		const imagePath = await copyFixture(directory, 'png-not-optimized.png', '-leading-hyphen.png');
		const sizeBefore = await fileSize(imagePath);

		const result = await runCli(['--', imagePath]);

		expect(result.code).toBe(0);
		await expect(fileSize(imagePath)).resolves.toBeLessThan(sizeBefore);
	});

	test('redirected output contains no progress animation', async () => {
		const directory = await makeTemporaryDirectory();
		const imagePath = await copyFixture(directory, 'png-not-optimized.png');

		const result = await runCli(['--avif', '--webp', imagePath]);

		expect(result.code).toBe(0);
		expect(result.stdout).toBe('');
		expect(result.stderr).toContain(summaryLine('2 processed'));
		expect(result.stderr).not.toMatch(/Processed \d+ of \d+/);
		expect(result.stderr).not.toMatch(/[░▒█]/);
		expect(result.stderr).not.toContain('\u{1B}[');
	});

	test('a dumb terminal gets ASCII diagnostics without progress or color', async () => {
		const directory = await makeTemporaryDirectory();
		const imagePath = await copyFixture(directory, 'png-not-optimized.png');

		const result = await runCli([imagePath], { environment: { TERM: 'dumb' } });

		expect(result.code).toBe(0);
		expect(result.stderr).toContain('i Optimizing 1 image');
		expect(result.stderr).not.toMatch(/Processed \d+ of \d+/);
		expect(result.stderr).not.toMatch(/[░▒█]/);
		expect(result.stderr).not.toContain('\u{1B}[');
	});

	test('a corrupt image makes the invocation fail while independent work succeeds', async () => {
		const directory = await makeTemporaryDirectory();
		const validPath = await copyFixture(directory, 'png-not-optimized.png', 'valid.png');
		const corruptPath = path.join(directory, 'corrupt.png');
		await fs.writeFile(corruptPath, 'not an image');
		const validBefore = await fileSize(validPath);

		const result = await runCli([corruptPath, validPath]);

		expect(result.code).toBe(1);
		expect(result.stdout).toBe('');
		expect(result.stderr).toContain('1 failed');
		expect(result.stderr).not.toContain('Done!');
		await expect(fileSize(validPath)).resolves.toBeLessThan(validBefore);
	});

	test('an empty directory is a successful no-op', async () => {
		const directory = await makeTemporaryDirectory();
		const result = await runCli([directory]);

		expect(result.code).toBe(0);
		expect(result.stdout).toBe('');
		expect(result.stderr).toContain('No eligible images found');
	});

	test('force is rejected outside conversion mode', async () => {
		const result = await runCli(['--force', '/unused']);

		expect(result.code).toBe(1);
		expect(result.stderr).toContain('--force requires --avif or --webp');
	});
});

describe('configuration', () => {
	test('a missing explicit configuration is reported precisely', async () => {
		const directory = await makeTemporaryDirectory();
		const imagePath = await copyFixture(directory, 'png-not-optimized.png');
		const configPath = path.join(directory, 'missing.cjs');

		const result = await runCli(['--config', configPath, imagePath]);

		expect(result.code).toBe(1);
		expect(result.stderr).toContain(`Config file does not exist: ${configPath}`);
		expect(result.stderr).not.toContain('Configuration file is invalid');
	});

	test('a non-file explicit configuration is reported precisely', async () => {
		const directory = await makeTemporaryDirectory();
		const imagePath = await copyFixture(directory, 'png-not-optimized.png');

		const result = await runCli(['--config', directory, imagePath]);

		expect(result.code).toBe(1);
		expect(result.stderr).toContain(`Config path does not refer to a file: ${directory}`);
		expect(result.stderr).not.toContain('Configuration file is invalid');
	});

	test('a configuration that fails to load names its path and reason', async () => {
		const directory = await makeTemporaryDirectory();
		const imagePath = await copyFixture(directory, 'png-not-optimized.png');
		const configPath = path.join(directory, 'throws.cjs');
		await fs.writeFile(configPath, 'throw new Error("broken configuration");\n');

		const result = await runCli(['--config', configPath, imagePath]);

		expect(result.code).toBe(1);
		expect(result.stderr).toContain(`Could not load configuration ${configPath}`);
		expect(result.stderr).toContain('broken configuration');
		expect(result.stderr).not.toContain('    at ');
	});

	test.each([
		['null', 'module.exports = { optimize: null };\n'],
		['an array', 'module.exports = { optimize: [] };\n'],
		['absent', 'module.exports = { convert: {} };\n'],
	])('a selected section that is %s is rejected', async (_name, source) => {
		const directory = await makeTemporaryDirectory();
		const imagePath = await copyFixture(directory, 'png-not-optimized.png');
		const configPath = path.join(directory, 'config.cjs');
		await fs.writeFile(configPath, source);

		const result = await runCli(['--config', configPath, imagePath]);

		expect(result.code).toBe(1);
		expect(result.stderr).toContain(`Configuration ${configPath} must define an object-valued "optimize" section`);
	});

	test('a custom configuration replaces the bundled defaults for the selected mode', async () => {
		const directory = await makeTemporaryDirectory();
		const imagePath = await copyFixture(directory, 'png-not-optimized.png');
		const configPath = path.join(directory, 'config.cjs');
		await fs.writeFile(configPath, 'module.exports = { optimize: { png: { lossy: { colors: 4, palette: true } } } };\n');
		const bundled = await runCli([await copyFixture(directory, 'png-not-optimized.png', 'bundled.png')]);
		const bundledSize = await fileSize(path.join(directory, 'bundled.png'));

		const result = await runCli(['--config', configPath, imagePath]);

		expect(bundled.code).toBe(0);
		expect(result.code).toBe(0);
		await expect(fileSize(imagePath)).resolves.toBeLessThan(bundledSize);
	});

	test('an invalid codec option is reported by the codec without a stack trace', async () => {
		const directory = await makeTemporaryDirectory();
		const imagePath = await copyFixture(directory, 'png-not-optimized.png');
		const configPath = path.join(directory, 'config.cjs');
		await fs.writeFile(configPath, 'module.exports = { optimize: { png: { lossy: { compressionLevel: 42 } } } };\n');

		const result = await runCli(['--config', configPath, imagePath]);

		expect(result.code).toBe(1);
		expect(result.stderr).toContain('1 failed');
		expect(result.stderr).toContain('compressionLevel');
		expect(result.stderr).not.toContain('    at ');
	});

	test('debug mode adds a stack trace and version details', async () => {
		const directory = await makeTemporaryDirectory();
		const imagePath = await copyFixture(directory, 'png-not-optimized.png');
		const configPath = path.join(directory, 'throws.cjs');
		await fs.writeFile(configPath, 'throw new Error("broken configuration");\n');

		const result = await runCli(['--debug', '--config', configPath, imagePath]);

		expect(result.code).toBe(1);
		expect(result.stderr).toContain('    at ');
		expect(result.stderr).toContain(`Node.js ${process.version}`);
		expect(result.stderr).not.toContain('PATH');
	});
});
