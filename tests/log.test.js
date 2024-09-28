import { jest } from '@jest/globals';

import { colorize } from '../lib/colorize.js';
import { log } from '../lib/log.js';

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
			type: 'info',
		});
	});

	test('Logged “success” with symbol', () => {
		expectLog({
			symbol: symbols.success[symbolIndex],
			title: 'success',
			type: 'success',
		});
	});

	test('Logged “warning” with symbol', () => {
		expectLog({
			symbol: symbols.warning[symbolIndex],
			title: 'warning',
			type: 'warning',
		});
	});

	test('Logged “error” with symbol', () => {
		expectLog({
			symbol: symbols.error[symbolIndex],
			title: 'error',
			type: 'error',
		});
	});
});

function expectLog({
	description,
	symbol,
	title,
	type,
}) {
	const symbolColored = colorize(symbol)[colors[(type || 'info')]];
	const descriptionColored = description
		? colorize(description).dim
		: undefined;

	console.log = jest.fn();
	log(title, { type, description });

	expect(console.log.mock.calls[0][0]).toBe(symbolColored);
	expect(console.log.mock.calls[0][1]).toBe(title);
	expect(console.log.mock.calls[0][4]).toBe(descriptionColored);

	console.log.mockRestore();
}
