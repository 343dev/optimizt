import {
	describe, expect, test, vi, afterEach,
} from 'vitest';

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { getRelativePath } from '../lib/get-relative-path.js';
import { prepareFilePaths } from '../lib/prepare-file-paths.js';

const dirname = path.dirname(fileURLToPath(import.meta.url));

const DEFAULT_IMAGE_PATH = resolvePath(['images']);
const DEFAULT_EXTENSIONS = ['gif', 'jpeg', 'jpg', 'png', 'svg'];

function resolvePath(segments) {
	return path.resolve(dirname, ...segments);
}

async function generateInputPaths({ inputPaths = [DEFAULT_IMAGE_PATH], extensions = DEFAULT_EXTENSIONS } = {}) {
	const result = await prepareFilePaths({ inputPaths, extensions });
	return result.map(item => getRelativePath(item.input));
}

describe('prepareFilePaths', () => {
	afterEach(() => {
		vi.restoreAllMocks();
	});

	describe('path validation', () => {
		test('should ignore non-existent file paths', async () => {
			const inputPaths = await generateInputPaths({
				inputPaths: [
					resolvePath(['not+exists']),
					resolvePath(['not+exists.svg']),
				],
			});

			expect(inputPaths).toStrictEqual([]);
		});

		test('should handle file system errors gracefully', async () => {
			// Mock fs.promises.stat to throw an error for specific paths
			const originalStat = fs.promises.stat;
			const mockStat = vi.fn().mockImplementation(filePath => {
				if (filePath.includes('inaccessible')) {
					throw new Error('ENOENT: no such file or directory');
				}

				return originalStat(filePath);
			});

			vi.spyOn(fs.promises, 'stat').mockImplementation(mockStat);

			const result = await prepareFilePaths({
				inputPaths: [
					'/inaccessible/path/file.jpg',
					'/another/inaccessible/file.png',
					resolvePath(['images', 'jpeg-not-optimized.jpeg']), // This should work
				],
				extensions: ['jpg', 'png', 'jpeg'],
			});

			// Should only include the accessible file, inaccessible paths should be ignored
			expect(result.length).toBeGreaterThan(0);
			expect(result.every(item => !item.input.includes('inaccessible'))).toBe(true);
		});
	});

	describe('directory processing', () => {
		test('should process files from subdirectories', async () => {
			const inputPaths = await generateInputPaths();

			expect(inputPaths).toEqual(
				expect.arrayContaining([
					expect.stringMatching(/file-in-subdirectory.jpg$/),
				]),
			);
		});

		test('should handle complex directory structures with output path', async () => {
			const outputDirectory = '/complex/output';

			const result = await prepareFilePaths({
				inputPaths: [
					resolvePath(['images']), // Directory with subdirectories
					resolvePath(['images', 'jpeg-not-optimized.jpeg']), // Individual file
				],
				outputDirectoryPath: outputDirectory,
				extensions: ['jpg', 'jpeg', 'png', 'gif', 'svg'],
			});

			// Should include files from subdirectories
			expect(result.length).toBeGreaterThan(2);

			// Check that subdirectory files have correct output paths
			const subdirFile = result.find(item => item.input.includes('subdirectory'));
			expect(subdirFile).toBeDefined();
			expect(subdirFile.output).toMatch(new RegExp(`^${outputDirectory.replaceAll(/[/\\]/g, String.raw`[/\\]`)}`));
			expect(subdirFile.output).toMatch(/subdirectory/);
		});
	});

	describe('file filtering', () => {
		test('should filter files by extension', async () => {
			const inputPaths = await generateInputPaths({ extensions: ['gif', 'jpeg', 'png', 'svg'] });

			expect(inputPaths).toEqual(
				expect.arrayContaining([
					expect.stringMatching(/\.gif$/),
					expect.stringMatching(/\.png$/),
					expect.stringMatching(/\.svg$/),
				]),
			);

			expect(inputPaths).not.toEqual(
				expect.arrayContaining([
					expect.stringMatching(/\.jpg$/),
				]),
			);
		});
	});

	describe('path generation', () => {
		test('should generate only relative file paths', async () => {
			const inputPaths = await generateInputPaths();

			expect(inputPaths).not.toEqual(
				expect.arrayContaining([
					expect.stringMatching(new RegExp(`^${dirname}`)),
				]),
			);
		});

		test('should generate output paths with directories', async () => {
			const outputDirectory = '/output/directory';

			const result = await prepareFilePaths({
				inputPaths: [resolvePath(['images'])], // Directory input
				outputDirectoryPath: outputDirectory,
				extensions: ['jpg', 'jpeg', 'png', 'gif', 'svg'],
			});

			// Should have files with modified output paths
			expect(result.length).toBeGreaterThan(0);

			// All output paths should start with the output directory
			for (const item of result) {
				expect(item.output).toMatch(new RegExp(`^${outputDirectory.replaceAll(/[/\\]/g, String.raw`[/\\]`)}`));
				expect(item.input).not.toBe(item.output);
			}
		});

		test('should generate output paths with individual files', async () => {
			const outputDirectory = '/output/directory';

			const result = await prepareFilePaths({
				inputPaths: [
					resolvePath(['images', 'jpeg-not-optimized.jpeg']),
					resolvePath(['images', 'png-not-optimized.png']),
				], // Individual file inputs
				outputDirectoryPath: outputDirectory,
				extensions: ['jpg', 'jpeg', 'png', 'gif', 'svg'],
			});

			// Should have files with modified output paths
			expect(result.length).toBe(2);

			// All output paths should start with the output directory
			for (const item of result) {
				expect(item.output).toMatch(new RegExp(`^${outputDirectory.replaceAll(/[/\\]/g, String.raw`[/\\]`)}`));
				expect(item.input).not.toBe(item.output);
			}
		});
	});
});
