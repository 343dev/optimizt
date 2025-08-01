import {
	describe, expect, test, vi, beforeEach,
} from 'vitest';

import { parseImageMetadata } from '../lib/parse-image-metadata.js';

// vi.mock() required for external dependency
vi.mock('sharp', () => ({
	default: vi.fn(),
}));

describe('parseImageMetadata', () => {
	let sharp;

	beforeEach(async () => {
		vi.clearAllMocks();
		const sharpModule = await import('sharp');
		sharp = sharpModule.default;
	});

	describe('format detection', () => {
		test('should detect GIF format correctly', async () => {
			const mockBuffer = Buffer.from('mock-gif-data');
			const mockSharpInstance = {
				metadata: vi.fn().mockResolvedValue({
					format: 'gif',
					pages: 10,
				}),
			};
			sharp.mockReturnValue(mockSharpInstance);

			const result = await parseImageMetadata(mockBuffer);

			expect(sharp).toHaveBeenCalledWith(mockBuffer);
			expect(mockSharpInstance.metadata).toHaveBeenCalled();
			expect(result.format).toBe('gif');
		});

		test('should detect JPEG format correctly', async () => {
			const mockBuffer = Buffer.from('mock-jpeg-data');
			const mockSharpInstance = {
				metadata: vi.fn().mockResolvedValue({
					format: 'jpeg',
					pages: 1,
				}),
			};
			sharp.mockReturnValue(mockSharpInstance);

			const result = await parseImageMetadata(mockBuffer);

			expect(sharp).toHaveBeenCalledWith(mockBuffer);
			expect(mockSharpInstance.metadata).toHaveBeenCalled();
			expect(result.format).toBe('jpeg');
		});

		test('should detect PNG format correctly', async () => {
			const mockBuffer = Buffer.from('mock-png-data');
			const mockSharpInstance = {
				metadata: vi.fn().mockResolvedValue({
					format: 'png',
					pages: 1,
				}),
			};
			sharp.mockReturnValue(mockSharpInstance);

			const result = await parseImageMetadata(mockBuffer);

			expect(sharp).toHaveBeenCalledWith(mockBuffer);
			expect(mockSharpInstance.metadata).toHaveBeenCalled();
			expect(result.format).toBe('png');
		});

		test('should detect SVG format correctly', async () => {
			const mockBuffer = Buffer.from('mock-svg-data');
			const mockSharpInstance = {
				metadata: vi.fn().mockResolvedValue({
					format: 'svg',
					pages: 1,
				}),
			};
			sharp.mockReturnValue(mockSharpInstance);

			const result = await parseImageMetadata(mockBuffer);

			expect(sharp).toHaveBeenCalledWith(mockBuffer);
			expect(mockSharpInstance.metadata).toHaveBeenCalled();
			expect(result.format).toBe('svg');
		});
	});

	describe('metadata extraction', () => {
		test('should detect frame count in animated GIF', async () => {
			const mockBuffer = Buffer.from('mock-animated-gif-data');
			const mockSharpInstance = {
				metadata: vi.fn().mockResolvedValue({
					format: 'gif',
					pages: 10,
				}),
			};
			sharp.mockReturnValue(mockSharpInstance);

			const result = await parseImageMetadata(mockBuffer);

			expect(result.pages).toBe(10);
		});

		test('should handle single frame images', async () => {
			const mockBuffer = Buffer.from('mock-static-image-data');
			const mockSharpInstance = {
				metadata: vi.fn().mockResolvedValue({
					format: 'jpeg',
					pages: 1,
				}),
			};
			sharp.mockReturnValue(mockSharpInstance);

			const result = await parseImageMetadata(mockBuffer);

			expect(result.pages).toBe(1);
		});
	});

	describe('error handling', () => {
		test('should return empty object when Sharp fails to parse metadata', async () => {
			const invalidBuffer = Buffer.from('invalid image data that will cause Sharp to throw');
			const mockSharpInstance = {
				metadata: vi.fn().mockRejectedValue(new Error('Sharp parsing failed')),
			};
			sharp.mockReturnValue(mockSharpInstance);

			const result = await parseImageMetadata(invalidBuffer);

			expect(result).toEqual({});
		});

		test('should handle Sharp constructor throwing error', async () => {
			const invalidBuffer = Buffer.from('invalid image data');
			sharp.mockImplementation(() => {
				throw new Error('Sharp constructor failed');
			});

			const result = await parseImageMetadata(invalidBuffer);

			expect(result).toEqual({});
		});

		test('should handle metadata method returning undefined', async () => {
			const mockBuffer = Buffer.from('mock-data');
			const mockSharpInstance = {
				metadata: vi.fn().mockResolvedValue(),
			};
			sharp.mockReturnValue(mockSharpInstance);

			const result = await parseImageMetadata(mockBuffer);

			expect(result).toBeUndefined();
		});
	});
});
