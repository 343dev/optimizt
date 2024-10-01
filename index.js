import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

import { SUPPORTED_FILE_TYPES } from './lib/constants.js';
import convert from './lib/convert.js';
import { findConfig } from './lib/find-config.js';
import { log, logErrorAndExit } from './lib/log.js';
import optimize from './lib/optimize.js';
import { prepareFilePaths } from './lib/prepare-file-paths.js';
import { prepareOutputDirectoryPath } from './lib/prepare-output-directory-path.js';
import { programOptions } from './lib/program-options.js';

const MODE_NAME = {
	CONVERT: 'convert',
	OPTIMIZE: 'optimize',
};

export default async function optimizt({
	inputPaths,
	outputDirectoryPath,
	configFilePath,
}) {
	const {
		isLossless,
		shouldConvertToAvif,
		shouldConvertToWebp,
	} = programOptions;

	const shouldConvert = shouldConvertToAvif || shouldConvertToWebp;

	const currentMode = shouldConvert
		? MODE_NAME.CONVERT
		: MODE_NAME.OPTIMIZE;

	const preparedConfigFilePath = pathToFileURL(
		configFilePath
			? resolveProvidedConfigPath(configFilePath)
			: await findConfig(),
	);
	const configData = await import(preparedConfigFilePath);
	const config = configData.default[currentMode.toLowerCase()];

	const filePaths = await prepareFilePaths({
		inputPaths,
		outputDirectoryPath: await prepareOutputDirectoryPath(outputDirectoryPath),
		extensions: SUPPORTED_FILE_TYPES[currentMode.toUpperCase()],
	});

	if (isLossless) {
		log('Lossless optimization may take a long time');
	}

	const processFunction = shouldConvert
		? convert
		: optimize;

	await processFunction({
		filePaths,
		config,
	});
}

function resolveProvidedConfigPath(filepath = '') {
	const resolvedPath = path.resolve(filepath);

	if (!fs.existsSync(resolvedPath)) {
		logErrorAndExit('Provided config path does not exist');
	}

	if (!fs.statSync(resolvedPath).isFile()) {
		logErrorAndExit('Provided config path must point to a file');
	}

	return resolvedPath;
}
