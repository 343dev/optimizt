import { expect, test } from 'vitest';

import { formatBytes } from '../lib/format-bytes.js';

test('0 should be formatted as "0 Bytes"', () => {
	expect(formatBytes(0)).toBe('0 Bytes');
});

test('1023 should be formatted as “1023 Bytes”', () => {
	expect(formatBytes(1023)).toBe('1023 Bytes');
});

test('1024 should be formatted as “1 KB”', () => {
	expect(formatBytes(1024)).toBe('1 KB');
});

test('1047552 should be formatted as “1023 KB”', () => {
	expect(formatBytes(1_047_552)).toBe('1023 KB');
});

test('1048576 should be formatted as “1 MB”', () => {
	expect(formatBytes(1_048_576)).toBe('1 MB');
});

test('1072693248 should be formatted as “1023 MB”', () => {
	expect(formatBytes(1_072_693_248)).toBe('1023 MB');
});

test('1073741824 should be formatted as “1 GB”', () => {
	expect(formatBytes(1_073_741_824)).toBe('1 GB');
});

test('1098437885952 should be formatted as “1023 GB”', () => {
	expect(formatBytes(1_098_437_885_952)).toBe('1023 GB');
});

test('1099511627776 should be formatted as “1 TB”', () => {
	expect(formatBytes(1_099_511_627_776)).toBe('1 TB');
});
