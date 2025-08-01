import {
	expect, test, describe, beforeEach, afterEach, vi,
} from 'vitest';

describe('program-options', () => {
	let programOptions;
	let setProgramOptions;

	beforeEach(async () => {
		// Reset module state by re-importing
		vi.resetModules();
		const module = await import('../lib/program-options.js');
		programOptions = module.programOptions;
		setProgramOptions = module.setProgramOptions;
	});

	afterEach(() => {
		vi.clearAllMocks();
	});

	describe('default values', () => {
		test('should have correct default values', () => {
			expect(programOptions).toEqual({
				shouldConvertToAvif: false,
				shouldConvertToWebp: false,
				isForced: false,
				isLossless: false,
				isVerbose: false,
			});
		});
	});

	describe('setProgramOptions', () => {
		test('should update programOptions when called with new values', () => {
			const newOptions = {
				isVerbose: true,
				isForced: true,
			};

			setProgramOptions(newOptions);

			expect(programOptions.isVerbose).toBe(true);
			expect(programOptions.isForced).toBe(true);
			// Other options should remain unchanged
			expect(programOptions.shouldConvertToAvif).toBe(false);
			expect(programOptions.shouldConvertToWebp).toBe(false);
			expect(programOptions.isLossless).toBe(false);
		});

		test('should handle partial option updates', () => {
			const partialOptions = {
				shouldConvertToAvif: true,
			};

			setProgramOptions(partialOptions);

			expect(programOptions.shouldConvertToAvif).toBe(true);
			// All other options should remain at their default values
			expect(programOptions.shouldConvertToWebp).toBe(false);
			expect(programOptions.isForced).toBe(false);
			expect(programOptions.isLossless).toBe(false);
			expect(programOptions.isVerbose).toBe(false);
		});

		test('should handle empty options object', () => {
			const originalOptions = { ...programOptions };

			setProgramOptions({});

			expect(programOptions).toEqual(originalOptions);
			expect(Object.isFrozen(programOptions)).toBe(true);
		});

		test('should handle all options being set to true', () => {
			const allTrueOptions = {
				shouldConvertToAvif: true,
				shouldConvertToWebp: true,
				isForced: true,
				isLossless: true,
				isVerbose: true,
			};

			setProgramOptions(allTrueOptions);

			expect(programOptions).toEqual(allTrueOptions);
		});

		test('should handle mixed boolean values', () => {
			const mixedOptions = {
				shouldConvertToAvif: true,
				shouldConvertToWebp: false,
				isForced: true,
				isLossless: false,
				isVerbose: true,
			};

			setProgramOptions(mixedOptions);

			expect(programOptions).toEqual(mixedOptions);
		});
	});

	describe('object freezing', () => {
		test('should freeze programOptions after setProgramOptions is called', () => {
			const newOptions = { isVerbose: true };

			setProgramOptions(newOptions);

			expect(Object.isFrozen(programOptions)).toBe(true);
		});

		test('should not allow direct modification after freezing', () => {
			const newOptions = { isVerbose: true };

			setProgramOptions(newOptions);

			// Attempting to modify frozen object should throw an error
			expect(() => {
				programOptions.isForced = true;
			}).toThrow('Cannot assign to read only property');
		});
	});
});
