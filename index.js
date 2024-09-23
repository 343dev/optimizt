import { pathToFileURL } from 'node:url';

import checkConfigPath from './lib/check-config-path.js';
import convert from './lib/convert.js';
import findConfig from './lib/find-config.js';
import { enableVerbose } from './lib/log.js';
import optimize from './lib/optimize.js';
import prepareFilePaths from './lib/prepare-file-paths.js';
import prepareOutputPath from './lib/prepare-output-path.js';

const MODE_NAME = {
	convert: 'convert',
	optimize: 'optimize',
};

const SUPPORTED_FILE_TYPES = {
	convert: ['gif', 'jpeg', 'jpg', 'png'],
	optimize: ['gif', 'jpeg', 'jpg', 'png', 'svg'],
};

export default async function optimizt({
	paths: inputPaths,
	output: outputDirectoryPath,
	config: configFilePath,

	avif: shouldConvertToAvif,
	webp: shouldConvertToWebp,

	force: isForced,
	lossless: isLossless,
	verbose: isVerbose,
}) {
	const shouldConvert = shouldConvertToAvif || shouldConvertToWebp;

	const currentMode = shouldConvert
		? MODE_NAME.convert
		: MODE_NAME.optimize;

	const preparedConfigFilePath = pathToFileURL(
		configFilePath
			? checkConfigPath(configFilePath)
			: findConfig(),
	);
	const configData = await import(preparedConfigFilePath);
	const config = configData.default[currentMode];

	const preparedInputPaths = await prepareFilePaths(inputPaths, SUPPORTED_FILE_TYPES[currentMode]);
	const preparedOutputDirectoryPath = prepareOutputPath(outputDirectoryPath);

	if (isVerbose) {
		enableVerbose();
	}

	const process = shouldConvert
		? convert
		: optimize;

	await process({
		paths: preparedInputPaths,
		output: preparedOutputDirectoryPath,
		lossless: isLossless,
		config,

		...shouldConvert && {
			avif: shouldConvertToAvif,
			webp: shouldConvertToWebp,
			force: isForced,
		},
	});
}
