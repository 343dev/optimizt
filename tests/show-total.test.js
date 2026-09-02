import { expect, test, vi } from 'vitest';

import { showTotal } from '../lib/show-total.js';

vi.mock('../lib/log.js', () => ({
	log: vi.fn(),
	logEmptyLine: vi.fn(),
}));

import { log } from '../lib/log.js';

test('optimization summary reports savings for written operations', () => {
	showTotal(100, 60, [{ status: 'processed' }, { status: 'skipped' }]);
	expect(log).toHaveBeenCalledWith('1 processed, 1 skipped, 0 failed');
	expect(log).toHaveBeenCalledWith('40 Bytes saved (40%)');
});

test('summary omits size when no operation was processed', () => {
	showTotal(0, 0, [{ status: 'failed' }]);
	expect(log).toHaveBeenCalledWith('0 processed, 0 skipped, 1 failed');
});

test('conversion summary reports created bytes', () => {
	showTotal(100, 60, [{ status: 'processed' }], { conversion: true });
	expect(log).toHaveBeenCalledWith('60 Bytes created');
});
