import { EOL } from 'node:os';

import { colorize } from './colorize.js';
import { programOptions } from './program-options.js';

export const LOG_TYPES = {
	INFO: 'info',
	SUCCESS: 'success',
	WARNING: 'warning',
	ERROR: 'error',
};

const colors = {
	[LOG_TYPES.INFO]: 'blue',
	[LOG_TYPES.SUCCESS]: 'green',
	[LOG_TYPES.WARNING]: 'yellow',
	[LOG_TYPES.ERROR]: 'red',
};

const symbols = {
	[LOG_TYPES.INFO]: ['i', 'ℹ'],
	[LOG_TYPES.SUCCESS]: ['√', '✔'],
	[LOG_TYPES.WARNING]: ['‼', '⚠'],
	[LOG_TYPES.ERROR]: ['×', '✖'],
};

const isUnicodeSupported = process.platform !== 'win32' || process.env.TERM === 'xterm-256color';
const symbolIndex = isUnicodeSupported ? 1 : 0;

function formatLogMessage(title, { type = LOG_TYPES.INFO, description } = {}) {
	if (!title) {
		throw new Error('Title is required');
	}

	/*
		We use an array to create the message so that we can conveniently test
		the content of `console.log` in tests
	 */
	return [
		colorize(symbols[type][symbolIndex])[colors[type]],
		title,
		...description ? [EOL, ' ', colorize(description).dim] : [],
	];
}

export function log(title, { type, description } = {}) {
	console.log(...formatLogMessage(title, { type, description }));
}

export function logErrorAndExit(title) {
	log(title, { type: LOG_TYPES.ERROR });
	process.exit(1); // eslint-disable-line unicorn/no-process-exit
}

export function logEmptyLine() {
	console.log();
}

export function logProgress(title, { type, description, progressBarContainer } = {}) {
	if (process.stdout.isTTY && progressBarContainer) {
		const message = `${formatLogMessage(title, { type, description }).join(' ')}${EOL}`;
		progressBarContainer.log(message);

		return;
	}

	log(title, { type, description });
}

export function logProgressVerbose(title, { type, description, progressBarContainer } = {}) {
	if (programOptions.isVerbose) {
		logProgress(title, { type, description, progressBarContainer });
	}
}
