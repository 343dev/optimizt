import {
	expect, test, describe, vi, beforeEach,
} from 'vitest';
import CliProgress from 'cli-progress';
import { getPlural } from '../lib/get-plural.js';

import { createProgressBarContainer } from '../lib/create-progress-bar-container.js';

// Mock cli-progress module
vi.mock('cli-progress', () => ({
	default: {
		MultiBar: vi.fn(),
		Presets: {
			shades_classic: 'shades_classic_preset', // eslint-disable-line camelcase
		},
	},
}));

// Mock getPlural function
vi.mock('../lib/get-plural.js', () => ({
	getPlural: vi.fn(),
}));

describe('createProgressBarContainer', () => {
	const mockMultiBar = {
		create: vi.fn(),
		stop: vi.fn(),
		update: vi.fn(),
	};

	beforeEach(() => {
		vi.clearAllMocks();
		vi.mocked(CliProgress.MultiBar).mockReturnValue(mockMultiBar);
	});

	test('should create MultiBar instance with correct configuration', () => {
		vi.mocked(getPlural).mockReturnValue('images');

		const result = createProgressBarContainer(5);

		expect(CliProgress.MultiBar).toHaveBeenCalledWith(
			{
				format: '{bar} {percentage}% | Processed {value} of {total} images',
				clearOnComplete: true,
			},
			'shades_classic_preset',
		);
		expect(result).toBe(mockMultiBar);
	});

	test('should use singular "image" when count equals 1', () => {
		vi.mocked(getPlural).mockReturnValue('image');

		createProgressBarContainer(1);

		expect(getPlural).toHaveBeenCalledWith(1, 'image', 'images');
		expect(CliProgress.MultiBar).toHaveBeenCalledWith(
			{
				format: '{bar} {percentage}% | Processed {value} of {total} image',
				clearOnComplete: true,
			},
			'shades_classic_preset',
		);
	});

	test('should use plural "images" when count is greater than 1', () => {
		vi.mocked(getPlural).mockReturnValue('images');

		createProgressBarContainer(10);

		expect(getPlural).toHaveBeenCalledWith(10, 'image', 'images');
		expect(CliProgress.MultiBar).toHaveBeenCalledWith(
			{
				format: '{bar} {percentage}% | Processed {value} of {total} images',
				clearOnComplete: true,
			},
			'shades_classic_preset',
		);
	});

	test('should use plural "images" when count is 0', () => {
		vi.mocked(getPlural).mockReturnValue('images');

		createProgressBarContainer(0);

		expect(getPlural).toHaveBeenCalledWith(0, 'image', 'images');
		expect(CliProgress.MultiBar).toHaveBeenCalledWith(
			{
				format: '{bar} {percentage}% | Processed {value} of {total} images',
				clearOnComplete: true,
			},
			'shades_classic_preset',
		);
	});

	test('should handle large numbers', () => {
		vi.mocked(getPlural).mockReturnValue('images');

		createProgressBarContainer(1000);

		expect(getPlural).toHaveBeenCalledWith(1000, 'image', 'images');
		expect(CliProgress.MultiBar).toHaveBeenCalledWith(
			{
				format: '{bar} {percentage}% | Processed {value} of {total} images',
				clearOnComplete: true,
			},
			'shades_classic_preset',
		);
	});

	test('should always set clearOnComplete to true', () => {
		vi.mocked(getPlural).mockReturnValue('images');

		createProgressBarContainer(5);

		const [config] = vi.mocked(CliProgress.MultiBar).mock.calls[0];
		expect(config.clearOnComplete).toBe(true);
	});

	test('should always use shades_classic preset', () => {
		vi.mocked(getPlural).mockReturnValue('images');

		createProgressBarContainer(5);

		const [, preset] = vi.mocked(CliProgress.MultiBar).mock.calls[0];
		expect(preset).toBe('shades_classic_preset');
	});

	test('should include all required format placeholders', () => {
		vi.mocked(getPlural).mockReturnValue('images');

		createProgressBarContainer(5);

		const [config] = vi.mocked(CliProgress.MultiBar).mock.calls[0];
		const { format } = config;

		expect(format).toContain('{bar}');
		expect(format).toContain('{percentage}');
		expect(format).toContain('{value}');
		expect(format).toContain('{total}');
	});
});
