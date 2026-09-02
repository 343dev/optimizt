#!/usr/bin/env node

import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { Command, CommanderError } from 'commander';

import optimizt from './index.js';
import { finishLifecycle, installSignalHandlers } from './lib/lifecycle.js';
import { setProgramOptions } from './lib/program-options.js';

const dirname = path.dirname(fileURLToPath(import.meta.url));
const packageJson = JSON.parse(await fs.readFile(path.join(dirname, 'package.json'), 'utf8'));
const program = new Command();

program
	.name('optimizt')
	.option('--avif', 'create AVIF variants')
	.option('--webp', 'create WebP variants')
	.option('-f, --force', 'replace existing conversion targets')
	.option('-l, --lossless', 'use the lossless processing profile')
	.option('-v, --verbose', 'show skipped and deduplicated work')
	.option('-c, --config <path>', 'replace defaults with this executable CJS configuration')
	.option('-o, --output <path>', 'write under an existing output directory')
	.option('-p, --prefix <text>', 'add a prefix to output file names')
	.option('-s, --suffix <text>', 'add a suffix to output file names')
	.option('--no-color', 'disable color output')
	.option('--debug', 'include stack traces and version details in errors')
	.allowExcessArguments()
	.usage('[options] [--] <dir|file ...>')
	.version(packageJson.version, '-V, --version')
	.description(`${packageJson.description}. Optimizes in place by default; --avif and --webp create variants.`)
	.exitOverride();

let exitCode = 0;
installSignalHandlers(() => {});
try {
	program.parse(process.argv);
	if (program.args.length === 0) {
		program.outputHelp();
	} else {
		const options = program.opts();
		if (options.force && !options.avif && !options.webp) throw new Error('--force requires --avif or --webp');
		setProgramOptions({
			filePrefix: options.prefix || '',
			fileSuffix: options.suffix || '',
			isForced: Boolean(options.force),
			isLossless: Boolean(options.lossless),
			isVerbose: Boolean(options.verbose),
			shouldConvertToAvif: Boolean(options.avif),
			shouldConvertToWebp: Boolean(options.webp),
		});
		if (options.color === false) process.env.NO_COLOR = '1';
		const result = await optimizt({
			configFilePath: options.config,
			inputPaths: program.args,
			outputDirectoryPath: options.output,
		});
		exitCode = result.failed > 0 ? 1 : 0;
	}
} catch (error) {
	if (error instanceof CommanderError && ['commander.helpDisplayed', 'commander.version'].includes(error.code)) {
		exitCode = 0;
	} else {
		exitCode = 1;
		const debug = program.opts().debug;
		const message = debug && error.stack ? error.stack : error.message;
		process.stderr.write(`Error: ${message}\n`);
		if (debug) process.stderr.write(`Optimizt ${packageJson.version}; Node.js ${process.version}\n`);
	}
}
process.exitCode = finishLifecycle() ?? exitCode;
