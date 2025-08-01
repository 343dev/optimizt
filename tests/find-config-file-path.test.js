import {
	expect, test, describe, vi, beforeEach, afterEach,
} from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import * as logModule from '../lib/log.js';

import { findConfigFilePath } from '../lib/find-config-file-path.js';

// vi.mock() required for Node.js built-in module mocking
vi.mock('node:fs', () => ({
	default: {
		promises: {
			stat: vi.fn(),
		},
	},
}));

// vi.mock() required for constants module
vi.mock('../lib/constants.js', () => ({
	DEFAULT_CONFIG_FILENAME: '.optimiztrc.cjs',
}));

describe('findConfigFilePath', () => {
	const mockStat = vi.mocked(fs.promises.stat);
	let mockLogErrorAndExit;

	const mockCwd = '/mock/current/directory';

	beforeEach(() => {
		vi.clearAllMocks();
		vi.spyOn(process, 'cwd').mockReturnValue(mockCwd);
		mockLogErrorAndExit = vi.spyOn(logModule, 'logErrorAndExit').mockImplementation(() => {});
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	describe('when provided config path exists', () => {
		test('should return resolved path for valid file', async () => {
			const providedPath = './custom-config.cjs';
			const resolvedPath = path.resolve(providedPath);

			mockStat.mockResolvedValue({ isFile: () => true });

			const result = await findConfigFilePath(providedPath);

			expect(result).toBe(resolvedPath);
			expect(mockStat).toHaveBeenCalledWith(resolvedPath);
		});

		test('should call logErrorAndExit when provided path is directory', async () => {
			const providedPath = './config-directory';
			const resolvedPath = path.resolve(providedPath);

			mockStat.mockResolvedValue({ isFile: () => false });

			await findConfigFilePath(providedPath);

			expect(mockStat).toHaveBeenCalledWith(resolvedPath);
			expect(mockLogErrorAndExit).toHaveBeenCalledWith('Config path must point to a file');
		});

		test('should call logErrorAndExit when provided path does not exist', async () => {
			const providedPath = './nonexistent-config.cjs';
			const resolvedPath = path.resolve(providedPath);

			mockStat.mockRejectedValue(new Error('ENOENT: no such file or directory'));

			await findConfigFilePath(providedPath);

			expect(mockStat).toHaveBeenCalledWith(resolvedPath);
			expect(mockLogErrorAndExit).toHaveBeenCalledWith(`Config file not exists: ${resolvedPath}`);
		});
	});

	describe('when no config path is provided', () => {
		test('should return config path from current directory when it exists', async () => {
			const expectedPath = path.join(mockCwd, '.optimiztrc.cjs');

			mockStat.mockResolvedValue({ isFile: () => true });

			const result = await findConfigFilePath();

			expect(result).toBe(expectedPath);
			expect(mockStat).toHaveBeenCalledWith(expectedPath);
		});

		test('should search in parent directories when config not found in current directory', async () => {
			const currentDirectory = '/deep/nested/directory';
			const parentDirectory = '/deep/nested';
			const grandparentDirectory = '/deep';
			const rootDirectory = '/';

			vi.spyOn(process, 'cwd').mockReturnValue(currentDirectory);

			// Mock path.dirname to return parent directories
			const originalDirname = path.dirname;
			vi.spyOn(path, 'dirname')
				.mockReturnValueOnce(parentDirectory)
				.mockReturnValueOnce(grandparentDirectory)
				.mockReturnValueOnce(rootDirectory)
				.mockReturnValueOnce(rootDirectory); // Root returns itself

			// First call (current directory) - file not found
			mockStat.mockRejectedValueOnce(new Error('ENOENT'));
			// Second call (parent directory) - file not found
			mockStat.mockRejectedValueOnce(new Error('ENOENT'));
			// Third call (grandparent directory) - file found
			mockStat.mockResolvedValueOnce({ isFile: () => true });

			const expectedPath = path.join(grandparentDirectory, '.optimiztrc.cjs');
			const result = await findConfigFilePath();

			expect(result).toBe(expectedPath);
			expect(mockStat).toHaveBeenCalledTimes(3);
			expect(mockStat).toHaveBeenNthCalledWith(1, path.join(currentDirectory, '.optimiztrc.cjs'));
			expect(mockStat).toHaveBeenNthCalledWith(2, path.join(parentDirectory, '.optimiztrc.cjs'));
			expect(mockStat).toHaveBeenNthCalledWith(3, expectedPath);

			// Restore original dirname
			path.dirname = originalDirname;
		});

		test('should return default config path when no config found anywhere', async () => {
			const currentDirectory = '/some/directory';
			const parentDirectory = '/some';
			const rootDirectory = '/';

			vi.spyOn(process, 'cwd').mockReturnValue(currentDirectory);

			// Mock path.dirname to simulate directory traversal to root
			const originalDirname = path.dirname;
			vi.spyOn(path, 'dirname')
				.mockReturnValueOnce(parentDirectory)
				.mockReturnValueOnce(rootDirectory)
				.mockReturnValueOnce(rootDirectory); // Root returns itself

			// All stat calls fail (no config file found)
			mockStat.mockRejectedValue(new Error('ENOENT'));

			const result = await findConfigFilePath();

			// The result should be the actual default path from the module
			expect(result).toContain('.optimiztrc.cjs');
			expect(mockStat).toHaveBeenCalledTimes(3);

			// Restore original dirname
			path.dirname = originalDirname;
		});

		test('should handle directory that is not a file during traversal', async () => {
			// Mock stat to return a directory instead of file
			mockStat.mockResolvedValue({ isFile: () => false });

			const result = await findConfigFilePath();

			// Should return default path when no valid config file is found
			expect(result).toContain('.optimiztrc.cjs');
			expect(mockStat).toHaveBeenCalled();
		});
	});

	describe('edge cases', () => {
		test('should handle empty string as no provided path (directory traversal)', async () => {
			// Empty string is falsy, so it should trigger directory traversal
			mockStat.mockRejectedValue(new Error('ENOENT'));

			const result = await findConfigFilePath('');

			// Should perform directory traversal and return default path
			expect(result).toContain('.optimiztrc.cjs');
			expect(mockStat).toHaveBeenCalled();
		});

		test('should handle absolute provided path', async () => {
			const absolutePath = '/absolute/path/to/config.cjs';

			mockStat.mockResolvedValue({ isFile: () => true });

			const result = await findConfigFilePath(absolutePath);

			expect(result).toBe(absolutePath);
			expect(mockStat).toHaveBeenCalledWith(absolutePath);
		});
	});
});
