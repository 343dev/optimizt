import { EOL } from 'node:os';
import { format } from 'node:util';

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
	[LOG_TYPES.WARNING]: ['!', '⚠'],
	[LOG_TYPES.ERROR]: ['x', '✖'],
};

function formatLogMessage(title, { type = LOG_TYPES.INFO, description } = {}) {
	if (!title) throw new Error('Title is required');
	const unicode = process.stderr.isTTY && process.env.TERM !== 'dumb';
	return [
		colorize(symbols[type][unicode ? 1 : 0])[colors[type]],
		title,
		...description ? [EOL, ' ', colorize(description).dim] : [],
	];
}

export function log(title, { type, description } = {}) {
	process.stderr.write(`${format(...formatLogMessage(title, { type, description }))}${EOL}`);
}

export function logEmptyLine() {
	process.stderr.write(EOL);
}

export function logProgress(title, { type, description, progressBarContainer } = {}) {
	if (process.stderr.isTTY && progressBarContainer) {
		progressBarContainer.log(`${formatLogMessage(title, { type, description }).join(' ')}${EOL}`);
		return;
	}
	log(title, { type, description });
}

export function logProgressVerbose(title, { type, description, progressBarContainer } = {}) {
	if (programOptions.isVerbose) logProgress(title, { type, description, progressBarContainer });
}
