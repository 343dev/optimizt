import { describe, expect, test } from 'vitest';

import { colorize } from '../lib/colorize.js';

const isTTY = Boolean(process.stdout.isTTY);

describe('Text colors', () => {
	test('Should be black ', () => {
		const expected = isTTY ? '\u{1B}[30mBlack\u{1B}[39m' : 'Black';
		expect(colorize('Black').black).toBe(expected);
	});

	test('Should be blue', () => {
		const expected = isTTY ? '\u{1B}[34mBlue\u{1B}[39m' : 'Blue';
		expect(colorize('Blue').blue).toBe(expected);
	});

	test('Should be cyan', () => {
		const expected = isTTY ? '\u{1B}[36mCyan\u{1B}[39m' : 'Cyan';
		expect(colorize('Cyan').cyan).toBe(expected);
	});

	test('Should be green', () => {
		const expected = isTTY ? '\u{1B}[32mGreen\u{1B}[39m' : 'Green';
		expect(colorize('Green').green).toBe(expected);
	});

	test('Should be magenta', () => {
		const expected = isTTY ? '\u{1B}[35mMagenta\u{1B}[39m' : 'Magenta';
		expect(colorize('Magenta').magenta).toBe(expected);
	});

	test('Should be red', () => {
		const expected = isTTY ? '\u{1B}[31mRed\u{1B}[39m' : 'Red';
		expect(colorize('Red').red).toBe(expected);
	});

	test('Should be white', () => {
		const expected = isTTY ? '\u{1B}[37mWhite\u{1B}[39m' : 'White';
		expect(colorize('White').white).toBe(expected);
	});

	test('Should be yellow', () => {
		const expected = isTTY ? '\u{1B}[33mYellow\u{1B}[39m' : 'Yellow';
		expect(colorize('Yellow').yellow).toBe(expected);
	});
});

describe('Background colors', () => {
	test('Should be black ', () => {
		const expected = isTTY ? '\u{1B}[40mBlack background\u{1B}[0m' : 'Black background';
		expect(colorize('Black background').bgBlack).toBe(expected);
	});

	test('Should be blue', () => {
		const expected = isTTY ? '\u{1B}[44mBlue background\u{1B}[0m' : 'Blue background';
		expect(colorize('Blue background').bgBlue).toBe(expected);
	});

	test('Should be cyan', () => {
		const expected = isTTY ? '\u{1B}[46mCyan background\u{1B}[0m' : 'Cyan background';
		expect(colorize('Cyan background').bgCyan).toBe(expected);
	});

	test('Should be green', () => {
		const expected = isTTY ? '\u{1B}[42mGreen background\u{1B}[0m' : 'Green background';
		expect(colorize('Green background').bgGreen).toBe(expected);
	});

	test('Should be magenta', () => {
		const expected = isTTY ? '\u{1B}[45mMagenta background\u{1B}[0m' : 'Magenta background';
		expect(colorize('Magenta background').bgMagenta).toBe(expected);
	});

	test('Should be red', () => {
		const expected = isTTY ? '\u{1B}[41mRed background\u{1B}[0m' : 'Red background';
		expect(colorize('Red background').bgRed).toBe(expected);
	});

	test('Should be white', () => {
		const expected = isTTY ? '\u{1B}[47mWhite background\u{1B}[0m' : 'White background';
		expect(colorize('White background').bgWhite).toBe(expected);
	});

	test('Should be yellow', () => {
		const expected = isTTY ? '\u{1B}[43mYellow background\u{1B}[0m' : 'Yellow background';
		expect(colorize('Yellow background').bgYellow).toBe(expected);
	});
});

describe('Other', () => {
	test('Text should be dimmed', () => {
		const expected = isTTY ? '\u{1B}[2mDimmed\u{1B}[22m' : 'Dimmed';
		expect(colorize('Dimmed').dim).toBe(expected);
	});

	test('Text should be reset', () => {
		const expected = isTTY ? '\u{1B}[0m\u{1B}[31mReset\u{1B}[39m\u{1B}[0m' : 'Reset';
		expect(colorize(colorize('Reset').red).reset).toBe(expected);
	});

	test('Colorize arguments are concatenated', () => {
		const expected = isTTY ? '\u{1B}[0m1 2 3\u{1B}[0m' : '1 2 3';
		expect(colorize(1, 2, 3).reset).toBe(expected);
	});
});
