import fs from 'node:fs';
import path from 'node:path';

import { logErrorAndExit } from './log.js';

export async function prepareOutputDirectoryPath(outputDirectoryPath) {
	if (!outputDirectoryPath) {
		return '';
	}

	const resolvedPath = path.resolve(outputDirectoryPath);

	try {
		const stat = await fs.promises.stat(resolvedPath);

		if (!stat.isDirectory()) {
			logErrorAndExit('Output path must be a directory');
		}
	} catch {
		logErrorAndExit('Output path does not exist');
	}

	return resolvedPath;
}
