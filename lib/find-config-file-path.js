import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { DEFAULT_CONFIG_FILENAME } from './constants.js';

const defaultDirectoryPath = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const defaultConfigPath = path.join(defaultDirectoryPath, DEFAULT_CONFIG_FILENAME);

export async function findConfigFilePath(providedConfigPath) {
	if (providedConfigPath) {
		const resolvedPath = path.resolve(providedConfigPath);
		let stat;
		try {
			stat = await fs.stat(resolvedPath);
		} catch (error) {
			if (error.code === 'ENOENT') throw new Error(`Configuration file does not exist: ${resolvedPath}. Provide the path to an existing CJS file.`, { cause: error });
			throw new Error(`Unable to inspect configuration file ${resolvedPath}: ${error.message}`, { cause: error });
		}
		if (!stat.isFile()) throw new Error(`Unable to use ${resolvedPath} as a configuration file. Provide the path to a CJS file.`);
		return resolvedPath;
	}

	let currentDirectoryPath = path.resolve(process.cwd());
	while (true) {
		const currentConfigPath = path.join(currentDirectoryPath, DEFAULT_CONFIG_FILENAME);
		try {
			const stat = await fs.stat(currentConfigPath);
			if (stat.isFile()) return currentConfigPath;
		} catch (error) {
			if (error.code !== 'ENOENT') throw new Error(`Unable to inspect configuration file ${currentConfigPath}: ${error.message}`, { cause: error });
		}
		const parentDirectoryPath = path.dirname(currentDirectoryPath);
		if (parentDirectoryPath === currentDirectoryPath) break;
		currentDirectoryPath = parentDirectoryPath;
	}
	return defaultConfigPath;
}
