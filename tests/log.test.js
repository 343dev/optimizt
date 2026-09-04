import { EOL } from 'node:os';

import { expect, test, vi } from 'vitest';

import { LOG_TYPES, log } from '../lib/log.js';

test.each([
	[undefined, 'i'],
	[LOG_TYPES.INFO, 'i'],
	[LOG_TYPES.SUCCESS, 'v'],
	[LOG_TYPES.WARNING, '!'],
	[LOG_TYPES.ERROR, 'x'],
])('logs %s messages to stderr', (type, symbol) => {
	const stderrSpy = vi.spyOn(process.stderr, 'write').mockImplementation(() => true);
	log('Title', { description: 'Description', type });

	expect(stderrSpy).toHaveBeenCalledWith(`${symbol} Title ${EOL}   Description${EOL}`);
	stderrSpy.mockRestore();
});
