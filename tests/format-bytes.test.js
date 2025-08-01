import { describe, expect, test } from 'vitest';

import { formatBytes } from '../lib/format-bytes.js';

describe('formatBytes', () => {
	describe('bytes formatting', () => {
		test('should format 0 as "0 Bytes"', () => {
			expect(formatBytes(0)).toBe('0 Bytes');
		});

		test('should format 1023 as "1023 Bytes"', () => {
			expect(formatBytes(1023)).toBe('1023 Bytes');
		});
	});

	describe('kilobytes formatting', () => {
		test('should format 1024 as "1 KB"', () => {
			expect(formatBytes(1024)).toBe('1 KB');
		});

		test('should format 1047552 as "1023 KB"', () => {
			expect(formatBytes(1_047_552)).toBe('1023 KB');
		});
	});

	describe('megabytes formatting', () => {
		test('should format 1048576 as "1 MB"', () => {
			expect(formatBytes(1_048_576)).toBe('1 MB');
		});

		test('should format 1072693248 as "1023 MB"', () => {
			expect(formatBytes(1_072_693_248)).toBe('1023 MB');
		});
	});

	describe('gigabytes formatting', () => {
		test('should format 1073741824 as "1 GB"', () => {
			expect(formatBytes(1_073_741_824)).toBe('1 GB');
		});

		test('should format 1098437885952 as "1023 GB"', () => {
			expect(formatBytes(1_098_437_885_952)).toBe('1023 GB');
		});
	});

	describe('terabytes formatting', () => {
		test('should format 1099511627776 as "1 TB"', () => {
			expect(formatBytes(1_099_511_627_776)).toBe('1 TB');
		});
	});
});
