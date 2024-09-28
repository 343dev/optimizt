import { calculateRatio } from '../lib/calculate-ratio.js';

test('Ratio should be “50” if the file size has decreased by 50%', () => {
	expect(calculateRatio(1_000_000, 500_000)).toBe(50);
});

test('Ratio should be “-100” if the file size has increased by 100%', () => {
	expect(calculateRatio(500_000, 1_000_000)).toBe(-100);
});
