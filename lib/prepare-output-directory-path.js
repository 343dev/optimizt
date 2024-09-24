import fs from 'node:fs';
import path from 'node:path';

import { logErrorAndExit } from './log.js';

export default function prepareOutputDirectoryPath(outputDirectoryPath) {
	if (!outputDirectoryPath) {
		return '';
	}

	const resolvedPath = path.resolve(outputDirectoryPath);

	if (!fs.existsSync(resolvedPath)) {
		logErrorAndExit('Output path does not exist');
	}

	if (!fs.lstatSync(resolvedPath).isDirectory()) {
		logErrorAndExit('Output path must be a directory');
	}

	return resolvedPath;
}
