import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { afterEach, beforeEach, describe, expect, test } from 'vitest';

const dirname = path.dirname(fileURLToPath(import.meta.url));
const cliPath = path.resolve('cli.js');
const images = path.join(dirname, 'images');
let temporary;

/* eslint-disable unicorn/no-top-level-assignment-in-function -- lifecycle-owned temporary fixture */
beforeEach(() => {
	temporary = fs.mkdtempSync(path.join(os.tmpdir(), 'optimizt-test-'));
});

afterEach(() => {
	fs.rmSync(temporary, { force: true, recursive: true });
});
/* eslint-enable unicorn/no-top-level-assignment-in-function */

describe('CLI image processing', () => {
	test('optimizes an image in place atomically', () => {
		const image = copyFixture('png-not-optimized.png', 'image with spaces.png');
		const before = fs.statSync(image);
		fs.chmodSync(image, 0o640);

		const result = runCli([image]);

		expect(result.status).toBe(0);
		expect(result.stdout).toBe('');
		expect(result.stderr).toContain('1 processed, 0 skipped, 0 failed');
		expect(fs.statSync(image).size).toBeLessThan(before.size);
		expect(fs.statSync(image).mode & 0o777).toBe(0o640);
		expect(findAtomicTemporaryFiles()).toEqual([]);
	});

	test('creates selected conversion variants without modifying the source', () => {
		const image = copyFixture('png-not-optimized.png');
		const before = fs.readFileSync(image);

		const result = runCli(['--avif', '--webp', image]);

		expect(result.status).toBe(0);
		expect(fs.readFileSync(image).equals(before)).toBe(true);
		expect(fs.existsSync(path.join(temporary, 'png-not-optimized.avif'))).toBe(true);
		expect(fs.existsSync(path.join(temporary, 'png-not-optimized.webp'))).toBe(true);
		expect(result.stderr).toContain('2 processed, 0 skipped, 0 failed');
	});

	test('skips existing conversion output unless force is used', () => {
		const image = copyFixture('png-not-optimized.png');
		const target = path.join(temporary, 'png-not-optimized.webp');
		fs.writeFileSync(target, 'existing');

		const skipped = runCli(['--verbose', '--webp', image]);
		expect(skipped.status).toBe(0);
		expect(fs.readFileSync(target, 'utf8')).toBe('existing');
		expect(skipped.stderr).toContain('0 processed, 1 skipped, 0 failed');

		const forced = runCli(['--force', '--webp', image]);
		expect(forced.status).toBe(0);
		expect(fs.readFileSync(target, 'utf8')).not.toBe('existing');
	});

	test('maps nested directory contents directly under an existing output root', () => {
		const input = path.join(temporary, 'input');
		const nested = path.join(input, 'nested');
		const output = path.join(temporary, 'output');
		fs.mkdirSync(nested, { recursive: true });
		fs.mkdirSync(output);
		fs.copyFileSync(path.join(images, 'png-not-optimized.png'), path.join(nested, 'picture.png'));

		const result = runCli(['--output', output, input]);

		expect(result.status).toBe(0);
		expect(fs.existsSync(path.join(output, 'nested', 'picture.png'))).toBe(true);
	});

	test('rejects invalid generated names rather than sanitizing them', () => {
		const image = copyFixture('png-not-optimized.png');
		const output = path.join(temporary, 'output');
		fs.mkdirSync(output);

		const result = runCli(['--prefix', '<unsafe>', '--output', output, image]);

		expect(result.status).toBe(1);
		expect(result.stderr).toContain('not portable');
		expect(fs.readdirSync(output)).toEqual([]);
	});

	test('help takes precedence over unrelated invalid arguments', () => {
		const result = runCli(['--help', '--unknown', '/missing']);
		expect(result.status).toBe(0);
		expect(result.stdout).toContain('Optimizes in place by default');
		expect(result.stderr).toBe('');
	});
});

function copyFixture(name, outputName = name) {
	const output = path.join(temporary, outputName);
	fs.copyFileSync(path.join(images, name), output);
	return output;
}

function findAtomicTemporaryFiles() {
	return fs.readdirSync(temporary).filter(name => name.includes('.optimizt') || /\.\w{6,}$/.test(name));
}

function runCli(arguments_) {
	const result = spawnSync(process.execPath, [cliPath, ...arguments_], { encoding: 'utf8' });
	return { status: result.status, stderr: result.stderr, stdout: result.stdout };
}
