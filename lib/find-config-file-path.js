import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { DEFAULT_CONFIG_FILENAME } from './constants.js';

const defaultDirectoryPath = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const defaultConfigPath = path.join(defaultDirectoryPath, DEFAULT_CONFIG_FILENAME);

export async function findConfigFilePath(providedConfigPath) {
	if (providedConfigPath) {
		const resolvedPath = path.resolve(providedConfigPath);
		try {
			const stat = await fs.stat(resolvedPath);
			if (!stat.isFile()) throw new Error('path does not refer to a file');
			return resolvedPath;
		} catch (error) {
			throw new Error(`Configuration file is invalid: ${resolvedPath}: ${error.message}`, { cause: error });
		}
	}

	let currentDirectoryPath = path.resolve(process.cwd());
	while (true) {
		const currentConfigPath = path.join(currentDirectoryPath, DEFAULT_CONFIG_FILENAME);
		try {
			const stat = await fs.stat(currentConfigPath);
			if (stat.isFile()) return currentConfigPath;
		} catch (error) {
			if (error.code !== 'ENOENT') throw new Error(`Cannot inspect configuration ${currentConfigPath}: ${error.message}`, { cause: error });
		}
		const parentDirectoryPath = path.dirname(currentDirectoryPath);
		if (parentDirectoryPath === currentDirectoryPath) break;
		currentDirectoryPath = parentDirectoryPath;
	}
	return defaultConfigPath;
}
