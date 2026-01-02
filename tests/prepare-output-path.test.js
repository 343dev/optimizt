import { expect, test, vi } from 'vitest';

import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { prepareOutputDirectoryPath } from '../lib/prepare-output-directory-path.js';

const dirname = path.dirname(fileURLToPath(import.meta.url));

test('Exit if the path does not exist', async () => {
	const processExitMock = vi.spyOn(process, 'exit').mockImplementation((exitCode) => {
		throw new Error(`Process exit with status code: ${exitCode}`);
	});

	const consoleSpy = vi.spyOn(console, 'log');

	await expect(() => prepareOutputDirectoryPath('not+exists')).rejects.toThrow();
	expect(processExitMock).toHaveBeenCalledWith(1);
	expect(consoleSpy.mock.calls[0][1]).toBe('Output path does not exist');

	consoleSpy.mockRestore();
	processExitMock.mockRestore();
});

test('Exit if specified path to file instead of directory', async () => {
	const processExitMock = vi.spyOn(process, 'exit').mockImplementation((exitCode) => {
		throw new Error(`Process exit with status code: ${exitCode}`);
	});

	const consoleSpy = vi.spyOn(console, 'log');

	await expect(() => prepareOutputDirectoryPath(path.resolve(dirname, 'images', 'svg-not-optimized.svg'))).rejects.toThrow();
	expect(processExitMock).toHaveBeenCalledWith(1);
	expect(consoleSpy.mock.calls[0][1]).toBe('Output path must be a directory');

	consoleSpy.mockRestore();
	processExitMock.mockRestore();
});

test('Full path is generated', async () => {
	expect(await prepareOutputDirectoryPath('tests/images')).toBe(path.resolve(dirname, 'images'));
});
