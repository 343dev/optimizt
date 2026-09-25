import { EOL } from 'node:os';
import { format } from 'node:util';

import { colorizeFor } from './colorize.js';
import { canUseUnicode } from './stream-capabilities.js';

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
	[LOG_TYPES.SUCCESS]: ['v', '✔'],
	[LOG_TYPES.WARNING]: ['!', '⚠'],
	[LOG_TYPES.ERROR]: ['x', '✖'],
};

export function createLog({ shouldUseColor } = {}) {
	function formatLogMessage(title, { type = LOG_TYPES.INFO, description } = {}) {
		if (!title) throw new Error('Title is required');
		return [
			colorizeFor(shouldUseColor, symbols[type][canUseUnicode() ? 1 : 0])[colors[type]],
			title,
			...description ? [EOL, ' ', colorizeFor(shouldUseColor, description).dim] : [],
		];
	}

	function log(title, { type, description } = {}) {
		process.stderr.write(`${format(...formatLogMessage(title, { type, description }))}${EOL}`);
	}

	return Object.freeze({
		log,
		logEmptyLine() {
			process.stderr.write(EOL);
		},
		logProgress(title, { type, description, progressBarContainer } = {}) {
			if (progressBarContainer?.isRendering) {
				progressBarContainer.log(`${formatLogMessage(title, { type, description }).join(' ')}${EOL}`);
				return;
			}
			log(title, { type, description });
		},
	});
}

const defaultLog = createLog();
export const { log, logEmptyLine, logProgress } = defaultLog;
