import {
	expect, test, describe, vi, beforeEach, afterEach,
} from 'vitest';
import path from 'node:path';

import { getRelativePath } from '../lib/get-relative-path.js';

describe('getRelativePath', () => {
	const mockCwd = '/mock/current/directory';

	beforeEach(() => {
		vi.spyOn(process, 'cwd').mockReturnValue(mockCwd);
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	test('should return relative path for absolute path within current directory', () => {
		const absolutePath = `/mock/current/directory${path.sep}src${path.sep}file.js`;
		const expected = `src${path.sep}file.js`;

		expect(getRelativePath(absolutePath)).toBe(expected);
	});

	test('should return relative path for nested file within current directory', () => {
		const absolutePath = `/mock/current/directory${path.sep}lib${path.sep}utils${path.sep}helper.js`;
		const expected = `lib${path.sep}utils${path.sep}helper.js`;

		expect(getRelativePath(absolutePath)).toBe(expected);
	});

	test('should return original path for absolute path outside current directory', () => {
		const absolutePath = `/different/directory${path.sep}file.js`;

		expect(getRelativePath(absolutePath)).toBe(absolutePath);
	});

	test('should return original path for relative path input', () => {
		const relativePath = `src${path.sep}file.js`;

		expect(getRelativePath(relativePath)).toBe(relativePath);
	});

	test('should handle path that exactly matches current directory', () => {
		const exactPath = mockCwd;

		expect(getRelativePath(exactPath)).toBe(exactPath);
	});

	test('should handle empty string input', () => {
		const emptyPath = '';

		expect(getRelativePath(emptyPath)).toBe(emptyPath);
	});

	test('should handle path with current directory as prefix but not exact match', () => {
		const similarPath = `/mock/current/directory-similar${path.sep}file.js`;

		expect(getRelativePath(similarPath)).toBe(similarPath);
	});

	test('should handle file directly in current directory', () => {
		const directFile = `/mock/current/directory${path.sep}file.js`;
		const expected = 'file.js';

		expect(getRelativePath(directFile)).toBe(expected);
	});
});
