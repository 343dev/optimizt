import { expect, test, describe } from 'vitest';

import { DEFAULT_CONFIG_FILENAME, SUPPORTED_FILE_TYPES } from '../lib/constants.js';

describe('Constants', () => {
	test('DEFAULT_CONFIG_FILENAME should equal ".optimiztrc.cjs"', () => {
		expect(DEFAULT_CONFIG_FILENAME).toBe('.optimiztrc.cjs');
	});

	test('DEFAULT_CONFIG_FILENAME should be a string', () => {
		expect(typeof DEFAULT_CONFIG_FILENAME).toBe('string');
	});

	describe('SUPPORTED_FILE_TYPES', () => {
		test('should have CONVERT and OPTIMIZE properties', () => {
			expect(SUPPORTED_FILE_TYPES).toHaveProperty('CONVERT');
			expect(SUPPORTED_FILE_TYPES).toHaveProperty('OPTIMIZE');
		});

		test('CONVERT should contain correct file extensions', () => {
			const expectedConvertTypes = ['gif', 'jpeg', 'jpg', 'png'];
			expect(SUPPORTED_FILE_TYPES.CONVERT).toEqual(expectedConvertTypes);
		});

		test('OPTIMIZE should contain correct file extensions', () => {
			const expectedOptimizeTypes = ['gif', 'jpeg', 'jpg', 'png', 'svg'];
			expect(SUPPORTED_FILE_TYPES.OPTIMIZE).toEqual(expectedOptimizeTypes);
		});

		test('CONVERT should be an array', () => {
			expect(Array.isArray(SUPPORTED_FILE_TYPES.CONVERT)).toBe(true);
		});

		test('OPTIMIZE should be an array', () => {
			expect(Array.isArray(SUPPORTED_FILE_TYPES.OPTIMIZE)).toBe(true);
		});

		test('OPTIMIZE should include all CONVERT types plus svg', () => {
			const convertTypes = SUPPORTED_FILE_TYPES.CONVERT;
			const optimizeTypes = SUPPORTED_FILE_TYPES.OPTIMIZE;

			for (const type of convertTypes) {
				expect(optimizeTypes).toContain(type);
			}

			expect(optimizeTypes).toContain('svg');
		});
	});
});
