import { pathToFileURL } from 'node:url';

import { SUPPORTED_FILE_TYPES } from './lib/constants.js';
import { convert } from './lib/convert.js';
import { findConfigFilePath } from './lib/find-config-file-path.js';
import { log } from './lib/log.js';
import { optimize } from './lib/optimize.js';
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

	const foundConfigFilePath = pathToFileURL(await findConfigFilePath(configFilePath));
	const configData = await import(foundConfigFilePath);
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
