import { describe, expect, test } from 'vitest';

import { colorize } from '../lib/colorize.js';

const isTTY = Boolean(process.stdout.isTTY);

describe('Text colors', () => {
	test('Should be black ', () => {
		const expected = isTTY ? '\u001B[30mBlack\u001B[39m' : 'Black';
		expect(colorize('Black').black).toBe(expected);
	});

	test('Should be blue', () => {
		const expected = isTTY ? '\u001B[34mBlue\u001B[39m' : 'Blue';
		expect(colorize('Blue').blue).toBe(expected);
	});

	test('Should be cyan', () => {
		const expected = isTTY ? '\u001B[36mCyan\u001B[39m' : 'Cyan';
		expect(colorize('Cyan').cyan).toBe(expected);
	});

	test('Should be green', () => {
		const expected = isTTY ? '\u001B[32mGreen\u001B[39m' : 'Green';
		expect(colorize('Green').green).toBe(expected);
	});

	test('Should be magenta', () => {
		const expected = isTTY ? '\u001B[35mMagenta\u001B[39m' : 'Magenta';
		expect(colorize('Magenta').magenta).toBe(expected);
	});

	test('Should be red', () => {
		const expected = isTTY ? '\u001B[31mRed\u001B[39m' : 'Red';
		expect(colorize('Red').red).toBe(expected);
	});

	test('Should be white', () => {
		const expected = isTTY ? '\u001B[37mWhite\u001B[39m' : 'White';
		expect(colorize('White').white).toBe(expected);
	});

	test('Should be yellow', () => {
		const expected = isTTY ? '\u001B[33mYellow\u001B[39m' : 'Yellow';
		expect(colorize('Yellow').yellow).toBe(expected);
	});
});

describe('Background colors', () => {
	test('Should be black ', () => {
		const expected = isTTY ? '\u001B[40mBlack background\u001B[0m' : 'Black background';
		expect(colorize('Black background').bgBlack).toBe(expected);
	});

	test('Should be blue', () => {
		const expected = isTTY ? '\u001B[44mBlue background\u001B[0m' : 'Blue background';
		expect(colorize('Blue background').bgBlue).toBe(expected);
	});

	test('Should be cyan', () => {
		const expected = isTTY ? '\u001B[46mCyan background\u001B[0m' : 'Cyan background';
		expect(colorize('Cyan background').bgCyan).toBe(expected);
	});

	test('Should be green', () => {
		const expected = isTTY ? '\u001B[42mGreen background\u001B[0m' : 'Green background';
		expect(colorize('Green background').bgGreen).toBe(expected);
	});

	test('Should be magenta', () => {
		const expected = isTTY ? '\u001B[45mMagenta background\u001B[0m' : 'Magenta background';
		expect(colorize('Magenta background').bgMagenta).toBe(expected);
	});

	test('Should be red', () => {
		const expected = isTTY ? '\u001B[41mRed background\u001B[0m' : 'Red background';
		expect(colorize('Red background').bgRed).toBe(expected);
	});

	test('Should be white', () => {
		const expected = isTTY ? '\u001B[47mWhite background\u001B[0m' : 'White background';
		expect(colorize('White background').bgWhite).toBe(expected);
	});

	test('Should be yellow', () => {
		const expected = isTTY ? '\u001B[43mYellow background\u001B[0m' : 'Yellow background';
		expect(colorize('Yellow background').bgYellow).toBe(expected);
	});
});

describe('Other', () => {
	test('Text should be dimmed', () => {
		const expected = isTTY ? '\u001B[2mDimmed\u001B[22m' : 'Dimmed';
		expect(colorize('Dimmed').dim).toBe(expected);
	});

	test('Text should be reset', () => {
		const expected = isTTY ? '\u001B[0m\u001B[31mReset\u001B[39m\u001B[0m' : 'Reset';
		expect(colorize(colorize('Reset').red).reset).toBe(expected);
	});

	test('Colorize arguments are concatenated', () => {
		const expected = isTTY ? '\u001B[0m1 2 3\u001B[0m' : '1 2 3';
		expect(colorize(1, 2, 3).reset).toBe(expected);
	});
});
