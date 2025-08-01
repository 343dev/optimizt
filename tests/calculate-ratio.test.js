import { describe, expect, test } from 'vitest';

import { calculateRatio } from '../lib/calculate-ratio.js';

describe('calculateRatio', () => {
	test('should return 50 when file size has decreased by 50%', () => {
		expect(calculateRatio(1_000_000, 500_000)).toBe(50);
	});

	test('should return -100 when file size has increased by 100%', () => {
		expect(calculateRatio(500_000, 1_000_000)).toBe(-100);
	});
});
