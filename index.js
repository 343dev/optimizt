import { pathToFileURL } from 'node:url';

import checkConfigPath from './lib/check-config-path.js';
import convert from './lib/convert.js';
import findConfig from './lib/find-config.js';
import { enableVerbose } from './lib/log.js';
import optimize from './lib/optimize.js';
import prepareConfig from './lib/prepare-config.js';
import prepareFilePaths from './lib/prepare-file-paths.js';
import prepareOutputPath from './lib/prepare-output-path.js';

export default async function optimizt({ paths, avif, webp, force, lossless, verbose, output, config }) {
  const configFilepath = pathToFileURL(config ? checkConfigPath(config) : findConfig());
  const configData = await import(configFilepath);
  const preparedConfig = prepareConfig(configData);

  if (verbose) enableVerbose();

  await (avif || webp ? convert({
      paths: prepareFilePaths(paths, ['gif', 'jpeg', 'jpg', 'png']),
      lossless,
      avif,
      webp,
      force,
      output: prepareOutputPath(output),
      config: preparedConfig.convert,
    }) : optimize({
      paths: prepareFilePaths(paths, ['gif', 'jpeg', 'jpg', 'png', 'svg']),
      lossless,
      output: prepareOutputPath(output),
      config: preparedConfig.optimize,
    }));
}
