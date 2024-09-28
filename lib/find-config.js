import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { DEFAULT_CONFIG_FILENAME } from './constants.js';

const defaultDirectoryPath = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const defaultConfigPath = path.join(defaultDirectoryPath, DEFAULT_CONFIG_FILENAME);

export async function findConfig() {
	let currentDirectoryPath = path.resolve(process.cwd());

	while (true) { // eslint-disable-line no-constant-condition
		const currentConfigPath = path.join(currentDirectoryPath, DEFAULT_CONFIG_FILENAME);

		try {
			const stat = await fs.stat(currentConfigPath); // eslint-disable-line no-await-in-loop

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
