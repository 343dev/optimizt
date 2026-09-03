import { beforeEach, expect, test, vi } from 'vitest';

import { OUTCOME_STATUS } from '../lib/outcome-status.js';
import { showTotal } from '../lib/show-total.js';

vi.mock('../lib/log.js', () => ({
	log: vi.fn(),
	logEmptyLine: vi.fn(),
}));

import { log } from '../lib/log.js';

beforeEach(() => {
	log.mockClear();
});

test('optimization summary reports savings for written operations', () => {
	showTotal(100, 60, [{ status: OUTCOME_STATUS.PROCESSED }, { status: OUTCOME_STATUS.SKIPPED }]);
	expect(log).toHaveBeenCalledWith('1 processed, 1 skipped, 0 failed');
	expect(log).toHaveBeenCalledWith('40 Bytes saved (40%)');
});

test('summary omits size when no operation was processed', () => {
	showTotal(0, 0, [{ status: OUTCOME_STATUS.FAILED }]);
	expect(log).toHaveBeenCalledWith('0 processed, 0 skipped, 1 failed');
});

test('summary reports operations left unstarted by interruption', () => {
	showTotal(0, 0, [
		{ status: OUTCOME_STATUS.UNSTARTED },
		{ status: OUTCOME_STATUS.UNSTARTED },
	]);
	expect(log).toHaveBeenCalledWith('0 processed, 0 skipped, 0 failed, 2 not started');
});

test('summary keeps work left undone by interruption out of failures', () => {
	showTotal(100, 60, [
		{ after: 60, before: 100, status: OUTCOME_STATUS.PROCESSED },
		{ status: OUTCOME_STATUS.UNSTARTED },
		{ status: OUTCOME_STATUS.UNSTARTED },
	]);
	expect(log).toHaveBeenCalledWith('1 processed, 0 skipped, 0 failed, 2 not started');
	expect(log).not.toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ type: 'error' }));
});

test('failure details are reported once in deterministic plan order', () => {
	showTotal(0, 0, [
		{ error: new Error('second'), output: '/tmp/second.png', planIndex: 1, status: OUTCOME_STATUS.FAILED },
		{ error: new Error('first'), output: '/tmp/first.png', planIndex: 0, status: OUTCOME_STATUS.FAILED },
	]);
	expect(log).toHaveBeenNthCalledWith(2, '/tmp/first.png', { description: 'first', type: 'error' });
	expect(log).toHaveBeenNthCalledWith(3, '/tmp/second.png', { description: 'second', type: 'error' });
});

test('conversion summary reports created bytes', () => {
	showTotal(100, 60, [{ status: OUTCOME_STATUS.PROCESSED }], { conversion: true });
	expect(log).toHaveBeenCalledWith('60 Bytes created');
});
