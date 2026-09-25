#!/usr/bin/env node

import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { Command, CommanderError } from 'commander';

import optimizt from './index.js';
import { createLifecycle } from './lib/lifecycle.js';

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
	.option('-c, --config <path>', 'use this CJS configuration file instead of the defaults')
	.option('-o, --output <path>', 'write under an existing output directory')
	.option('-p, --prefix <text>', 'add a prefix to output file names')
	.option('-s, --suffix <text>', 'add a suffix to output file names')
	.option('--no-color', 'disable color output')
	.option('--debug', 'include stack traces and version details in errors')
	.allowExcessArguments().usage('[options] [--] <dir|file ...>')
	.version(packageJson.version, '-V, --version')
	.description(`${packageJson.description}.`)
	.exitOverride();

let exitCode = 0;
const lifecycle = createLifecycle();
const releaseSignals = lifecycle.install();
try {
	program.parse(process.argv);
	if (program.args.length === 0) program.outputHelp();
	else {
		const parsed = program.opts();
		if (parsed.force && !parsed.avif && !parsed.webp) throw new Error('--force requires --avif or --webp');
		const options = Object.freeze({
			filePrefix: parsed.prefix || '', fileSuffix: parsed.suffix || '', isForced: Boolean(parsed.force),
			isLossless: Boolean(parsed.lossless), isVerbose: Boolean(parsed.verbose),
			shouldConvertToAvif: Boolean(parsed.avif), shouldConvertToWebp: Boolean(parsed.webp),
			shouldUseColor: parsed.color !== false && !process.env.NO_COLOR,
		});
		const result = await optimizt({ configFilePath: parsed.config, inputPaths: program.args, lifecycle, options, outputDirectoryPath: parsed.output });
		exitCode = result.failed > 0 ? 1 : 0;
	}
} catch (error) {
	if (error instanceof CommanderError && ['commander.helpDisplayed', 'commander.version'].includes(error.code)) exitCode = 0;
	else {
		exitCode = 1;
		const debug = program.opts().debug;
		process.stderr.write(`Error: ${debug && error.stack ? error.stack : error.message}\n`);
		if (debug) process.stderr.write(`Optimizt ${packageJson.version}; Node.js ${process.version}\n`);
	}
} finally {
	releaseSignals();
}
process.exitCode = lifecycle.finish() ?? exitCode;
