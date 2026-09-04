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

// Each supported format reaches a different codec, so every codec is exercised with the
// bundled configuration. Compression numbers are not asserted, only that real work happened.
const OPTIMIZED_FORMATS = [
	['GIF through gifsicle', 'gif-not-optimized.gif'],
	['JPEG through sharp', 'jpeg-not-optimized.jpeg'],
	['PNG through sharp', 'png-not-optimized.png'],
	['SVG through svgo', 'svg-not-optimized.svg'],
];

describe('optimization by format', () => {
	test.each(OPTIMIZED_FORMATS)('optimizes %s', async (_name, fixture) => {
		const directory = await makeTemporaryDirectory();
		const imagePath = await copyFixture(directory, fixture);
		const sizeBefore = await fileSize(imagePath);

		const result = await runCli([imagePath]);

		expect(result.code).toBe(0);
		expect(result.stderr).toContain(summaryLine('1 processed'));
		await expect(fileSize(imagePath)).resolves.toBeLessThan(sizeBefore);
	});

	test.each(OPTIMIZED_FORMATS)('optimizes %s in lossless mode', async (_name, fixture) => {
		const directory = await makeTemporaryDirectory();
		const imagePath = await copyFixture(directory, fixture);
		const sizeBefore = await fileSize(imagePath);

		// Lossless JPEG runs Guetzli, which is deliberately slow.
		const result = await runCli(['--lossless', imagePath]);

		expect(result.code).toBe(0);
		expect(result.stderr).toContain(summaryLine('1 processed'));
		await expect(fileSize(imagePath)).resolves.toBeLessThan(sizeBefore);
	}, 60_000);

	test.each([
		['an already optimized SVG', 'svg-optimized.svg'],
		['a JPEG that cannot be improved', 'jpeg-one-pixel.jpg'],
	])('skips %s without rewriting it', async (_name, fixture) => {
		const directory = await makeTemporaryDirectory();
		const imagePath = await copyFixture(directory, fixture);
		const before = await fs.readFile(imagePath);

		const result = await runCli([imagePath]);

		expect(result.code).toBe(0);
		expect(result.stderr).toContain(summaryLine('1 skipped'));
		const after = await fs.readFile(imagePath);
		expect(after.equals(before)).toBe(true);
	});
});

describe('conversion by format', () => {
	test.each([
		['GIF', 'gif-not-optimized.gif'],
		['JPEG', 'jpeg-not-optimized.jpeg'],
		['PNG', 'png-not-optimized.png'],
	])('converts %s to WebP', async (_name, fixture) => {
		const directory = await makeTemporaryDirectory();
		const imagePath = await copyFixture(directory, fixture);
		const before = await fs.readFile(imagePath);

		const result = await runCli(['--webp', imagePath]);

		expect(result.code).toBe(0);
		expect(result.stderr).toContain(summaryLine('1 processed'));
		const variant = path.join(directory, `${path.basename(fixture, path.extname(fixture))}.webp`);
		await expect(fileSize(variant)).resolves.toBeGreaterThan(0);
		const source = await fs.readFile(imagePath);
		expect(source.equals(before)).toBe(true);
	});

	test.each([
		['JPEG', 'jpeg-not-optimized.jpeg'],
		['PNG', 'png-not-optimized.png'],
	])('converts %s to AVIF', async (_name, fixture) => {
		const directory = await makeTemporaryDirectory();
		const imagePath = await copyFixture(directory, fixture);

		const result = await runCli(['--avif', imagePath]);

		expect(result.code).toBe(0);
		expect(result.stderr).toContain(summaryLine('1 processed'));
		const variant = path.join(directory, `${path.basename(fixture, path.extname(fixture))}.avif`);
		await expect(fileSize(variant)).resolves.toBeGreaterThan(0);
	});

	test('reports that an animated GIF cannot become AVIF', async () => {
		const directory = await makeTemporaryDirectory();
		const imagePath = await copyFixture(directory, 'gif-not-optimized.gif');

		const result = await runCli(['--avif', imagePath]);

		expect(result.code).toBe(1);
		expect(result.stderr).toContain(summaryLine('1 failed'));
		expect(result.stderr).toContain('Animated AVIF is not supported');
		await expect(fs.stat(path.join(directory, 'gif-not-optimized.avif'))).rejects.toThrow();
	});
});
