import {
	describe, expect, test, vi, afterEach,
} from 'vitest';

import { showTotal } from '../lib/show-total.js';

describe('showTotal', () => {
	let consoleSpy;

	afterEach(() => {
		if (consoleSpy) {
			consoleSpy.mockRestore();
		}
	});

	describe('when savings are achieved', () => {
		test('should display savings size and compression ratio', () => {
			const fileSize = 1_048_576;
			consoleSpy = vi.spyOn(console, 'log');

			showTotal(fileSize, fileSize / 2);

			expect(consoleSpy.mock.calls[1][1]).toBe('Yay! You saved 512 KB (50%)');
		});
	});

	describe('when no savings are achieved', () => {
		test('should display done message without savings', () => {
			const fileSize = 1_048_576;
			consoleSpy = vi.spyOn(console, 'log');

			showTotal(fileSize, fileSize * 2);

			expect(consoleSpy.mock.calls[1][1]).toBe('Done!');
		});
	});
});
