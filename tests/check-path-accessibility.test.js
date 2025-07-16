import {
	expect, test, describe, vi, beforeEach,
} from 'vitest';
import { access } from 'node:fs/promises';

import { checkPathAccessibility } from '../lib/check-path-accessibility.js';

// Mock the fs.promises.access function
vi.mock('node:fs/promises', () => ({
	access: vi.fn(),
}));

describe('checkPathAccessibility', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	test('should return true for accessible file path', async () => {
		// Mock successful access
		vi.mocked(access).mockResolvedValue();

		const result = await checkPathAccessibility('/path/to/accessible/file.txt');

		expect(result).toBe(true);
		expect(access).toHaveBeenCalledWith('/path/to/accessible/file.txt');
		expect(access).toHaveBeenCalledTimes(1);
	});

	test('should return false for inaccessible file path', async () => {
		// Mock access failure
		vi.mocked(access).mockRejectedValue(new Error('ENOENT: no such file or directory'));

		const result = await checkPathAccessibility('/path/to/nonexistent/file.txt');

		expect(result).toBe(false);
		expect(access).toHaveBeenCalledWith('/path/to/nonexistent/file.txt');
		expect(access).toHaveBeenCalledTimes(1);
	});

	test('should return true for accessible directory path', async () => {
		// Mock successful access for directory
		vi.mocked(access).mockResolvedValue();

		const result = await checkPathAccessibility('/path/to/accessible/directory');

		expect(result).toBe(true);
		expect(access).toHaveBeenCalledWith('/path/to/accessible/directory');
		expect(access).toHaveBeenCalledTimes(1);
	});

	test('should return false when access throws permission error', async () => {
		// Mock permission denied error
		vi.mocked(access).mockRejectedValue(new Error('EACCES: permission denied'));

		const result = await checkPathAccessibility('/path/to/restricted/file.txt');

		expect(result).toBe(false);
		expect(access).toHaveBeenCalledWith('/path/to/restricted/file.txt');
		expect(access).toHaveBeenCalledTimes(1);
	});

	test('should handle empty string path', async () => {
		// Mock access failure for empty string
		vi.mocked(access).mockRejectedValue(new Error('Invalid path'));

		const result = await checkPathAccessibility('');

		expect(result).toBe(false);
		expect(access).toHaveBeenCalledWith('');
		expect(access).toHaveBeenCalledTimes(1);
	});

	test('should handle relative path', async () => {
		// Mock successful access for relative path
		vi.mocked(access).mockResolvedValue();

		const result = await checkPathAccessibility('./relative/path/file.txt');

		expect(result).toBe(true);
		expect(access).toHaveBeenCalledWith('./relative/path/file.txt');
		expect(access).toHaveBeenCalledTimes(1);
	});

	test('should handle path with special characters', async () => {
		// Mock successful access for path with special characters
		vi.mocked(access).mockResolvedValue();

		const specialPath = '/path/with spaces/and-special_chars/file (1).txt';
		const result = await checkPathAccessibility(specialPath);

		expect(result).toBe(true);
		expect(access).toHaveBeenCalledWith(specialPath);
		expect(access).toHaveBeenCalledTimes(1);
	});

	test('should handle any type of error from fs.access', async () => {
		// Mock generic error
		vi.mocked(access).mockRejectedValue(new Error('Some unexpected error'));

		const result = await checkPathAccessibility('/some/path');

		expect(result).toBe(false);
		expect(access).toHaveBeenCalledWith('/some/path');
		expect(access).toHaveBeenCalledTimes(1);
	});
});
