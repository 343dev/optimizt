import { EOL } from 'node:os';

import { colorize } from './colorize.js';

const colors = {
	info: 'blue',
	success: 'green',
	warning: 'yellow',
	error: 'red',
};
const symbols = {
	info: ['i', 'ℹ'],
	success: ['√', '✔'],
	warning: ['‼', '⚠'],
	error: ['×', '✖'],
};
const symbolIndex = Number(process.platform !== 'win32' || process.env.TERM === 'xterm-256color');

let isVerbose = false;

function enableVerbose() {
	isVerbose = true;
}

function formatLogMessage(title, { type = 'info', description } = {}) {
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

function log(title, { type, description } = {}) {
	console.log(...formatLogMessage(title, { type, description }));
}

function logErrorAndExit(title) {
	log(title, { type: 'error' });
	process.exit(1); // eslint-disable-line unicorn/no-process-exit
}

function logEmptyLine() {
	console.log();
}

function logProgress(title, { type, description, progressBarContainer } = {}) {
	if (process.stdout.isTTY) {
		progressBarContainer.log(
			`${formatLogMessage(title, { type, description }).join(' ')}${EOL}`,
		);
	} else {
		log(title, { type, description });
	}
}

function logProgressVerbose(title, { type, description, progressBarContainer } = {}) {
	if (isVerbose) {
		logProgress(title, { type, description, progressBarContainer });
	}
}

export {
	enableVerbose,
	log,
	logEmptyLine,
	logErrorAndExit,
	logProgress,
	logProgressVerbose,
};
