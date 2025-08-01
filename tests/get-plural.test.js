import { describe, expect, test } from 'vitest';

import { getPlural } from '../lib/get-plural.js';

describe('getPlural', () => {
	test('should return singular form when count equals 1', () => {
		expect(getPlural(1, 'image', 'images')).toBe('image');
	});

	test('should return plural form when count equals 2', () => {
		expect(getPlural(2, 'image', 'images')).toBe('images');
	});
});
