import {
	describe, expect, test, vi,
} from 'vitest';

import { colorize } from '../lib/colorize.js';
import { LOG_TYPES, log } from '../lib/log.js';

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

test('Default log type is “info”', () => {
	expectLog({
		symbol: symbols.info[symbolIndex],
		title: 'default',
	});
});

test('Description logged', () => {
	expectLog({
		description: 'Simple description',
		symbol: symbols.info[symbolIndex],
		title: 'Hello!',
	});
});

describe('Titles and symbols', () => {
	test('Logged “info” with symbol', () => {
		expectLog({
			symbol: symbols.info[symbolIndex],
			title: 'info',
			type: LOG_TYPES.INFO,
		});
	});

	test('Logged “success” with symbol', () => {
		expectLog({
			symbol: symbols.success[symbolIndex],
			title: 'success',
			type: LOG_TYPES.SUCCESS,
		});
	});

	test('Logged “warning” with symbol', () => {
		expectLog({
			symbol: symbols.warning[symbolIndex],
			title: 'warning',
			type: LOG_TYPES.WARNING,
		});
	});

	test('Logged “error” with symbol', () => {
		expectLog({
			symbol: symbols.error[symbolIndex],
			title: 'error',
			type: LOG_TYPES.ERROR,
		});
	});
});

function expectLog({
	description,
	symbol,
	title,
	type,
}) {
	const symbolColored = colorize(symbol)[colors[(type || LOG_TYPES.INFO)]];
	const descriptionColored = description
		? colorize(description).dim
		: undefined;

	const consoleSpy = vi.spyOn(console, 'log');
	log(title, { type, description });

	expect(consoleSpy.mock.calls[0][0]).toBe(symbolColored);
	expect(consoleSpy.mock.calls[0][1]).toBe(title);
	expect(consoleSpy.mock.calls[0][4]).toBe(descriptionColored);

	consoleSpy.mockRestore();
}
