import {
	describe, expect, test, vi, afterEach,
} from 'vitest';

import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { prepareOutputDirectoryPath } from '../lib/prepare-output-directory-path.js';

const dirname = path.dirname(fileURLToPath(import.meta.url));

describe('prepareOutputDirectoryPath', () => {
	afterEach(() => {
		vi.restoreAllMocks();
	});

	describe('error handling', () => {
		test('should exit if the path does not exist', async () => {
			const processExitMock = vi.spyOn(process, 'exit').mockImplementation(exitCode => {
				throw new Error(`Process exit with status code: ${exitCode}`);
			});

			const consoleSpy = vi.spyOn(console, 'log');

			await expect(() => prepareOutputDirectoryPath('not+exists')).rejects.toThrow();
			expect(processExitMock).toHaveBeenCalledWith(1);
			expect(consoleSpy.mock.calls[0][1]).toBe('Output path does not exist');
		});

		test('should exit if specified path to file instead of directory', async () => {
			const processExitMock = vi.spyOn(process, 'exit').mockImplementation(exitCode => {
				throw new Error(`Process exit with status code: ${exitCode}`);
			});

			const consoleSpy = vi.spyOn(console, 'log');

			await expect(() => prepareOutputDirectoryPath(path.resolve(dirname, 'images', 'svg-not-optimized.svg'))).rejects.toThrow();
			expect(processExitMock).toHaveBeenCalledWith(1);
			expect(consoleSpy.mock.calls[0][1]).toBe('Output path must be a directory');
		});
	});

	describe('valid path handling', () => {
		test('should generate full path for valid directory', async () => {
			expect(await prepareOutputDirectoryPath('tests/images')).toBe(path.resolve(dirname, 'images'));
		});
	});

	describe('falsy value handling', () => {
		test('should return empty string when outputDirectoryPath is null', async () => {
			expect(await prepareOutputDirectoryPath(null)).toBe(''); // eslint-disable-line unicorn/no-null
		});

		test('should return empty string when outputDirectoryPath is undefined', async () => {
			expect(await prepareOutputDirectoryPath()).toBe('');
		});

		test('should return empty string when outputDirectoryPath is empty string', async () => {
			expect(await prepareOutputDirectoryPath('')).toBe('');
		});

		test('should return empty string when outputDirectoryPath is falsy (0)', async () => {
			expect(await prepareOutputDirectoryPath(0)).toBe('');
		});

		test('should return empty string when outputDirectoryPath is falsy (false)', async () => {
			expect(await prepareOutputDirectoryPath(false)).toBe('');
		});
	});
});
