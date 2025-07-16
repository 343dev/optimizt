import {
	describe, expect, test, vi,
} from 'vitest';

import { colorize } from '../lib/colorize.js';
import {
	LOG_TYPES, log, logProgress, logProgressVerbose, logErrorAndExit, logEmptyLine,
} from '../lib/log.js';
import { programOptions } from '../lib/program-options.js';

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

describe('Coverage tests for remaining log module functions', () => {
	test('log function throws error with empty title - covers lines 32-33', () => {
		expect(() => log()).toThrow('Title is required');
		expect(() => log()).toThrow('Title is required');
		expect(() => log('')).toThrow('Title is required');
	});

	describe('Unicode support branch coverage - covers lines 27-28', () => {
		test('Uses unicode symbols on non-Windows platforms', () => {
			const originalPlatform = process.platform;
			const originalTerm = process.env.TERM;

			// Mock non-Windows platform
			Object.defineProperty(process, 'platform', {
				value: 'darwin',
				configurable: true,
			});

			const consoleSpy = vi.spyOn(console, 'log');
			log('Test unicode', { type: LOG_TYPES.INFO });

			// Should use unicode symbol (index 1)
			const expectedSymbol = colorize('ℹ').blue;
			expect(consoleSpy.mock.calls[0][0]).toBe(expectedSymbol);

			// Restore original values
			Object.defineProperty(process, 'platform', {
				value: originalPlatform,
				configurable: true,
			});
			if (originalTerm !== undefined) {
				process.env.TERM = originalTerm;
			}

			consoleSpy.mockRestore();
		});

		test('Uses ASCII symbols on Windows without xterm-256color', async () => {
			const originalPlatform = process.platform;
			const originalTerm = process.env.TERM;

			// Mock Windows platform without xterm-256color
			Object.defineProperty(process, 'platform', {
				value: 'win32',
				configurable: true,
			});
			delete process.env.TERM;

			// Re-import the module to get fresh evaluation of isUnicodeSupported
			vi.resetModules();
			const { log: freshLog, LOG_TYPES: freshLogTypes } = await import('../lib/log.js');

			const consoleSpy = vi.spyOn(console, 'log');
			freshLog('Test ASCII', { type: freshLogTypes.INFO });

			// Should use ASCII symbol (index 0)
			const expectedSymbol = colorize('i').blue;
			expect(consoleSpy.mock.calls[0][0]).toBe(expectedSymbol);

			// Restore original values
			Object.defineProperty(process, 'platform', {
				value: originalPlatform,
				configurable: true,
			});
			if (originalTerm !== undefined) {
				process.env.TERM = originalTerm;
			}

			consoleSpy.mockRestore();
		});

		test('Uses unicode symbols on Windows with xterm-256color', () => {
			const originalPlatform = process.platform;
			const originalTerm = process.env.TERM;

			// Mock Windows platform with xterm-256color
			Object.defineProperty(process, 'platform', {
				value: 'win32',
				configurable: true,
			});
			process.env.TERM = 'xterm-256color';

			const consoleSpy = vi.spyOn(console, 'log');
			log('Test Windows unicode', { type: LOG_TYPES.INFO });

			// Should use unicode symbol (index 1)
			const expectedSymbol = colorize('ℹ').blue;
			expect(consoleSpy.mock.calls[0][0]).toBe(expectedSymbol);

			// Restore original values
			Object.defineProperty(process, 'platform', {
				value: originalPlatform,
				configurable: true,
			});
			if (originalTerm === undefined) {
				delete process.env.TERM;
			} else {
				process.env.TERM = originalTerm;
			}

			consoleSpy.mockRestore();
		});
	});

	describe('logProgress function coverage - covers lines 60-68', () => {
		test('logProgress with TTY and progressBarContainer', () => {
			const originalIsTTY = process.stdout.isTTY;
			const mockProgressBarContainer = {
				log: vi.fn(),
			};

			// Mock TTY to true
			Object.defineProperty(process.stdout, 'isTTY', {
				value: true,
				configurable: true,
			});

			const consoleSpy = vi.spyOn(console, 'log');

			logProgress('Test progress', {
				type: LOG_TYPES.INFO,
				description: 'Test description',
				progressBarContainer: mockProgressBarContainer,
			});

			// Should call progressBarContainer.log instead of console.log
			expect(mockProgressBarContainer.log).toHaveBeenCalledTimes(1);
			expect(consoleSpy).not.toHaveBeenCalled();

			// Restore original TTY state
			Object.defineProperty(process.stdout, 'isTTY', {
				value: originalIsTTY,
				configurable: true,
			});

			consoleSpy.mockRestore();
		});

		test('logProgress without TTY falls back to regular log', () => {
			const originalIsTTY = process.stdout.isTTY;
			const mockProgressBarContainer = {
				log: vi.fn(),
			};

			// Mock TTY to false
			Object.defineProperty(process.stdout, 'isTTY', {
				value: false,
				configurable: true,
			});

			const consoleSpy = vi.spyOn(console, 'log');

			logProgress('Test progress', {
				type: LOG_TYPES.INFO,
				description: 'Test description',
				progressBarContainer: mockProgressBarContainer,
			});

			// Should call console.log instead of progressBarContainer.log
			expect(mockProgressBarContainer.log).not.toHaveBeenCalled();
			expect(consoleSpy).toHaveBeenCalledTimes(1);

			// Restore original TTY state
			Object.defineProperty(process.stdout, 'isTTY', {
				value: originalIsTTY,
				configurable: true,
			});

			consoleSpy.mockRestore();
		});

		test('logProgress without progressBarContainer falls back to regular log', () => {
			const originalIsTTY = process.stdout.isTTY;

			// Mock TTY to true
			Object.defineProperty(process.stdout, 'isTTY', {
				value: true,
				configurable: true,
			});

			const consoleSpy = vi.spyOn(console, 'log');

			logProgress('Test progress', {
				type: LOG_TYPES.INFO,
				description: 'Test description',
			});

			// Should call console.log since no progressBarContainer
			expect(consoleSpy).toHaveBeenCalledTimes(1);

			// Restore original TTY state
			Object.defineProperty(process.stdout, 'isTTY', {
				value: originalIsTTY,
				configurable: true,
			});

			consoleSpy.mockRestore();
		});
	});

	describe('logProgressVerbose function coverage - covers lines 71-74', () => {
		test('logProgressVerbose calls logProgress when verbose is true', () => {
			const originalIsVerbose = programOptions.isVerbose;
			const originalIsTTY = process.stdout.isTTY;

			// Mock verbose to true
			Object.defineProperty(programOptions, 'isVerbose', {
				value: true,
				configurable: true,
			});

			// Mock TTY to false to ensure we hit the console.log path
			Object.defineProperty(process.stdout, 'isTTY', {
				value: false,
				configurable: true,
			});

			const consoleSpy = vi.spyOn(console, 'log');

			logProgressVerbose('Test verbose progress', {
				type: LOG_TYPES.SUCCESS,
				description: 'Verbose test description',
			});

			// Should call console.log since verbose is true
			expect(consoleSpy).toHaveBeenCalledTimes(1);

			// Restore original values
			Object.defineProperty(programOptions, 'isVerbose', {
				value: originalIsVerbose,
				configurable: true,
			});
			Object.defineProperty(process.stdout, 'isTTY', {
				value: originalIsTTY,
				configurable: true,
			});

			consoleSpy.mockRestore();
		});

		test('logProgressVerbose does not call logProgress when verbose is false', () => {
			const originalIsVerbose = programOptions.isVerbose;

			// Mock verbose to false
			Object.defineProperty(programOptions, 'isVerbose', {
				value: false,
				configurable: true,
			});

			const consoleSpy = vi.spyOn(console, 'log');

			logProgressVerbose('Test verbose progress', {
				type: LOG_TYPES.SUCCESS,
				description: 'Verbose test description',
			});

			// Should not call console.log since verbose is false
			expect(consoleSpy).not.toHaveBeenCalled();

			// Restore original value
			Object.defineProperty(programOptions, 'isVerbose', {
				value: originalIsVerbose,
				configurable: true,
			});

			consoleSpy.mockRestore();
		});
	});

	describe('Additional log functions for complete coverage', () => {
		test('logErrorAndExit calls log with error type and exits - covers lines 51-53', () => {
			const consoleSpy = vi.spyOn(console, 'log');
			const exitSpy = vi.spyOn(process, 'exit').mockImplementation(() => {});

			logErrorAndExit('Test error message');

			// Should call console.log with error formatting
			expect(consoleSpy).toHaveBeenCalledTimes(1);
			// Should call process.exit with code 1
			expect(exitSpy).toHaveBeenCalledWith(1);

			consoleSpy.mockRestore();
			exitSpy.mockRestore();
		});

		test('logEmptyLine calls console.log with no arguments - covers lines 56-57', () => {
			const consoleSpy = vi.spyOn(console, 'log');

			logEmptyLine();

			// Should call console.log with no arguments
			expect(consoleSpy).toHaveBeenCalledTimes(1);
			expect(consoleSpy).toHaveBeenCalledWith();

			consoleSpy.mockRestore();
		});
	});
});
