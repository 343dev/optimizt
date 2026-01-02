#!/usr/bin/env node

import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { program } from 'commander';

import optimizt from './index.js';
import { setProgramOptions } from './lib/program-options.js';

const dirname = path.dirname(fileURLToPath(import.meta.url));
const packageJson = JSON.parse(await fs.readFile(path.join(dirname, 'package.json')));

program
	.option('--avif', 'create AVIF and exit')
	.option('--webp', 'create WebP and exit')
	.option('-f, --force', 'force create AVIF and WebP')
	.option('-l, --lossless', 'perform lossless optimizations')
	.option('-v, --verbose', 'be verbose')
	.option('-c, --config <path>', 'use this configuration, overriding default config options if present')
	.option('-o, --output <path>', 'write output to directory')
	.option('-p, --prefix <text>', 'add prefix to optimized file names')
	.option('-s, --suffix <text>', 'add suffix to optimized file names');

program
	.allowExcessArguments()
	.usage('[options] <dir> <file ...>')
	.version(packageJson.version, '-V, --version')
	.description(packageJson.description)
	.parse(process.argv);

if (program.args.length === 0) {
	program.help();
} else {
	const { avif, webp, force, lossless, verbose, config, output, prefix, suffix } = program.opts();

	setProgramOptions({
		shouldConvertToAvif: Boolean(avif),
		shouldConvertToWebp: Boolean(webp),
		isForced: Boolean(force),
		isLossless: Boolean(lossless),
		isVerbose: Boolean(verbose),
		filePrefix: prefix || '',
		fileSuffix: suffix || '',
	});

	optimizt({
		inputPaths: program.args,
		outputDirectoryPath: output,
		configFilePath: config,
	});
}

process.on('unhandledRejection', (error) => {
	console.error(error);
});
