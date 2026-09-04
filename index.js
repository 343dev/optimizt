import { pathToFileURL } from 'node:url';

import { convert } from './convert.js';
import { optimize } from './optimize.js';
import { SUPPORTED_FILE_TYPES } from './lib/constants.js';
import { findConfigFilePath } from './lib/find-config-file-path.js';
import { log } from './lib/log.js';
import { prepareOperationPlan } from './lib/prepare-operation-plan.js';
import { programOptions } from './lib/program-options.js';

export default async function optimizt({ inputPaths, outputDirectoryPath, configFilePath }) {
	const { isForced, isLossless, filePrefix, fileSuffix, shouldConvertToAvif, shouldConvertToWebp } = programOptions;
	const formats = [
		...shouldConvertToAvif ? ['avif'] : [],
		...shouldConvertToWebp ? ['webp'] : [],
	];
	const currentMode = formats.length > 0 ? 'convert' : 'optimize';
	const operations = await prepareOperationPlan({
		extensions: SUPPORTED_FILE_TYPES[currentMode.toUpperCase()],
		force: isForced,
		formats: formats.length > 0 ? formats : ['optimize'],
		inputPaths,
		outputDirectoryPath,
		prefix: filePrefix,
		suffix: fileSuffix,
	});

	if (operations.length === 0) {
		log('No eligible images found');
		return { failed: 0 };
	}

	const configPath = await findConfigFilePath(configFilePath);
	let configData;
	try {
		configData = await import(`${pathToFileURL(configPath).href}?loaded=${Date.now()}`);
	} catch (error) {
		throw new Error(`Could not load configuration ${configPath}: ${error.message}`, { cause: error });
	}
	const config = configData.default?.[currentMode];
	if (!config || typeof config !== 'object' || Array.isArray(config)) {
		throw new Error(`Configuration ${configPath} must define an object-valued "${currentMode}" section`);
	}

	if (isLossless) log('Lossless mode may take a long time; JPEG uses Guetzli and is not strictly lossless');
	const processOperations = currentMode === 'convert' ? convert : optimize;
	return processOperations({ config, configPath, operations });
}
