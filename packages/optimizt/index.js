import { pathToFileURL } from 'node:url';

import { convert } from './convert.js';
import { optimize } from './optimize.js';
import { SUPPORTED_FILE_TYPES } from './lib/constants.js';
import { findConfigFilePath } from './lib/find-config-file-path.js';
import { createLog } from './lib/log.js';
import { prepareOperationPlan } from './lib/prepare-operation-plan.js';
import { createReporter } from './lib/reporter.js';

export default async function optimizt({ inputPaths, outputDirectoryPath, configFilePath, lifecycle, options }) {
	const { log } = createLog({ shouldUseColor: options.shouldUseColor });
	const formats = [...options.shouldConvertToAvif ? ['avif'] : [], ...options.shouldConvertToWebp ? ['webp'] : []];
	const mode = formats.length > 0 ? 'convert' : 'optimize';
	const plan = await prepareOperationPlan({
		extensions: SUPPORTED_FILE_TYPES[mode.toUpperCase()],
		force: options.isForced,
		formats: formats.length > 0 ? formats : ['optimize'],
		inputPaths,
		outputDirectoryPath,
		prefix: options.filePrefix,
		suffix: options.fileSuffix,
	});
	if (plan.operations.length === 0) {
		log('No eligible images found');
		return { failed: 0, interrupted: false };
	}

	const configPath = await findConfigFilePath(configFilePath);
	let configData;
	try {
		configData = await import(`${pathToFileURL(configPath).href}?loaded=${Date.now()}`);
	} catch (error) {
		throw new Error(`Unable to load configuration file ${configPath}: ${error.message}`, { cause: error });
	}
	const config = configData.default?.[mode];
	if (!config || typeof config !== 'object' || Array.isArray(config)) throw new Error(`Unable to use configuration file ${configPath}. Define "${mode}" as an object.`);

	const reporter = createReporter({ isLossless: options.isLossless, isVerbose: options.isVerbose, mode, operations: plan.operations, shouldUseColor: options.shouldUseColor });
	for (const notice of plan.notices) reporter.notice(notice);
	if (options.isLossless) log('Lossless mode may take a long time; JPEG uses Guetzli and is not strictly lossless');
	reporter.start();
	const execute = mode === 'convert' ? convert : optimize;
	const result = await execute({ config, configPath, lifecycle, operations: plan.operations, options, reporter });
	reporter.finish(result);
	return result;
}
