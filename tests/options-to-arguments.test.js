import { expect, test, describe } from 'vitest';

import { optionsToArguments } from '../lib/options-to-arguments.js';

describe('optionsToArguments', () => {
	test('should convert boolean true values to flags', () => {
		const options = { verbose: true, force: true };
		const result = optionsToArguments({ options });

		expect(result).toEqual(['--verbose', '--force']);
	});

	test('should exclude boolean false values from output', () => {
		const options = { verbose: true, quiet: false, force: true };
		const result = optionsToArguments({ options });

		expect(result).toEqual(['--verbose', '--force']);
		expect(result).not.toContain('--quiet');
	});

	test('should convert string values to key-value pairs', () => {
		const options = { output: 'dist', config: 'custom.json' };
		const result = optionsToArguments({ options });

		expect(result).toEqual(['--output', 'dist', '--config', 'custom.json']);
	});

	test('should convert number values to key-value pairs', () => {
		const options = { port: 3000, timeout: 5000 };
		const result = optionsToArguments({ options });

		expect(result).toEqual(['--port', '3000', '--timeout', '5000']);
	});

	test('should handle mixed option types', () => {
		const options = {
			verbose: true,
			quiet: false,
			output: 'dist',
			port: 3000,
		};
		const result = optionsToArguments({ options });

		expect(result).toEqual(['--verbose', '--output', 'dist', '--port', '3000']);
	});

	test('should use custom prefix when provided', () => {
		const options = { verbose: true, output: 'dist' };
		const result = optionsToArguments({ options, prefix: '-' });

		expect(result).toEqual(['-verbose', '-output', 'dist']);
	});

	test('should use concatenated format when concat is true', () => {
		const options = { output: 'dist', port: 3000 };
		const result = optionsToArguments({ options, concat: true });

		expect(result).toEqual(['--output=dist', '--port=3000']);
	});

	test('should handle boolean true values with concat option', () => {
		const options = { verbose: true, force: true };
		const result = optionsToArguments({ options, concat: true });

		expect(result).toEqual(['--verbose', '--force']);
	});

	test('should handle empty options object', () => {
		const options = {};
		const result = optionsToArguments({ options });

		expect(result).toEqual([]);
	});

	test('should handle options with only false values', () => {
		const options = { verbose: false, quiet: false };
		const result = optionsToArguments({ options });

		expect(result).toEqual([]);
	});

	test('should handle custom prefix with concat option', () => {
		const options = { output: 'dist', port: 3000 };
		const result = optionsToArguments({ options, prefix: '-', concat: true });

		expect(result).toEqual(['-output=dist', '-port=3000']);
	});

	test('should convert zero values correctly', () => {
		const options = { port: 0, timeout: 0 };
		const result = optionsToArguments({ options });

		expect(result).toEqual(['--port', '0', '--timeout', '0']);
	});

	test('should handle null and undefined values as strings', () => {
		const options = { nullValue: null, undefinedValue: undefined }; // eslint-disable-line unicorn/no-null
		const result = optionsToArguments({ options });

		expect(result).toEqual(['--nullValue', 'null', '--undefinedValue', 'undefined']);
	});
});
