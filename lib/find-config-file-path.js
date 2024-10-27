import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { DEFAULT_CONFIG_FILENAME } from './constants.js';
import { logErrorAndExit } from './log.js';

const defaultDirectoryPath = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const defaultConfigPath = path.join(defaultDirectoryPath, DEFAULT_CONFIG_FILENAME);

export async function findConfigFilePath(providedConfigPath) {
	if (providedConfigPath) {
		const resolvedPath = path.resolve(providedConfigPath);

		try {
			const stat = await fs.promises.stat(resolvedPath);

			if (!stat.isFile()) {
				logErrorAndExit('Config path must point to a file');
			}

			return resolvedPath;
		} catch {
			logErrorAndExit(`Config file not exists: ${resolvedPath}`);
		}
	}

	let currentDirectoryPath = path.resolve(process.cwd());

	while (true) {
		const currentConfigPath = path.join(currentDirectoryPath, DEFAULT_CONFIG_FILENAME);

		try {
			const stat = await fs.promises.stat(currentConfigPath); // eslint-disable-line no-await-in-loop

			if (stat.isFile()) {
				return currentConfigPath;
			}
		} catch {
			// File not found, continue searching
		}

		const parentDirectoryPath = path.dirname(currentDirectoryPath);

		if (parentDirectoryPath === currentDirectoryPath) {
			// Reached the root of the file system
			break;
		}

		currentDirectoryPath = parentDirectoryPath;
	}

	return defaultConfigPath;
}
