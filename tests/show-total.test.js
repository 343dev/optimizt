import { expect, test, vi } from 'vitest';

import { showTotal } from '../lib/show-total.js';

test('Savings size and compression ratio are displayed', () => {
	const fileSize = 1_048_576;

	const consoleSpy = vi.spyOn(console, 'log');

	showTotal(fileSize, fileSize / 2);
	expect(consoleSpy.mock.calls[1][1]).toBe('Yay! You saved 512 KB (50%)');

	consoleSpy.mockRestore();
});

test('Savings size and compression ratio are not displayed', () => {
	const fileSize = 1_048_576;

	const consoleSpy = vi.spyOn(console, 'log');

	showTotal(fileSize, fileSize * 2);
	expect(consoleSpy.mock.calls[1][1]).toBe('Done!');

	consoleSpy.mockRestore();
});
