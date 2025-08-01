import {
	beforeEach, describe, expect, test, vi,
} from 'vitest';

import { convert } from '../convert.js';

// vi.mock() required for Node.js built-in modules
vi.mock('node:fs', () => {
	const mockPromises = {
		readFile: vi.fn(),
		writeFile: vi.fn(),
		mkdir: vi.fn(),
	};
	return {
		default: {
			promises: mockPromises,
		},
		promises: mockPromises,
	};
});

vi.mock('node:os', () => ({
	default: {
		cpus: vi.fn(() => Array.from({ length: 4 }).fill({})), // Mock 4 CPU cores
	},
	cpus: vi.fn(() => Array.from({ length: 4 }).fill({})), // Mock 4 CPU cores
}));

vi.mock('node:path', async () => {
	const actual = await vi.importActual('node:path');
	return {
		...actual,
		parse: vi.fn(),
		join: vi.fn(),
		dirname: vi.fn(),
	};
});

// vi.mock() required for external dependencies
vi.mock('p-limit', () => ({
	default: vi.fn(_limit => function_ => function_()), // eslint-disable-line unicorn/consistent-function-scoping
}));

vi.mock('sharp', () => ({
	default: vi.fn(() => ({
		rotate: vi.fn().mockReturnThis(),
		avif: vi.fn().mockReturnThis(),
		webp: vi.fn().mockReturnThis(),
		toBuffer: vi.fn(),
	})),
}));

// vi.mock() required for utility functions due to complex module interdependencies
vi.mock('../lib/calculate-ratio.js', () => ({
	calculateRatio: vi.fn(),
}));

vi.mock('../lib/check-path-accessibility.js', () => ({
	checkPathAccessibility: vi.fn(),
}));

vi.mock('../lib/create-progress-bar-container.js', () => ({
	createProgressBarContainer: vi.fn(() => ({
		create: vi.fn(() => ({
			increment: vi.fn(),
		})),
		update: vi.fn(),
		stop: vi.fn(),
		log: vi.fn(),
	})),
}));

// vi.mock() required for constants module
vi.mock('../lib/constants.js', () => ({
	SUPPORTED_FILE_TYPES: {
		CONVERT: ['gif', 'jpeg', 'jpg', 'png'],
		OPTIMIZE: ['gif', 'jpeg', 'jpg', 'png', 'svg'],
	},
}));

vi.mock('../lib/format-bytes.js', () => ({
	formatBytes: vi.fn(),
}));

vi.mock('../lib/get-plural.js', () => ({
	getPlural: vi.fn(),
}));

vi.mock('../lib/get-relative-path.js', () => ({
	getRelativePath: vi.fn(),
}));

vi.mock('../lib/log.js', () => ({
	LOG_TYPES: {
		SUCCESS: 'success',
		ERROR: 'error',
		WARNING: 'warning',
	},
	log: vi.fn(),
	logProgress: vi.fn(),
	logProgressVerbose: vi.fn(),
}));

vi.mock('../lib/parse-image-metadata.js', () => ({
	parseImageMetadata: vi.fn(),
}));

// vi.mock() required for program options module state
vi.mock('../lib/program-options.js', () => ({
	programOptions: {
		isForced: false,
		isLossless: false,
		shouldConvertToAvif: false,
		shouldConvertToWebp: false,
	},
}));

vi.mock('../lib/show-total.js', () => ({
	showTotal: vi.fn(),
}));

describe('convert', () => {
	// Import mocked modules for test setup
	let fs;
	let path;
	let sharp;
	let calculateRatio;
	let checkPathAccessibility;
	let createProgressBarContainer;
	let formatBytes;
	let getPlural;
	let getRelativePath;
	let log;
	let logProgress;
	let logProgressVerbose;
	let parseImageMetadata;
	let programOptions;
	let showTotal;

	beforeEach(async () => {
		// Clear all mocks before each test
		vi.clearAllMocks();

		// Import mocked modules
		fs = await import('node:fs');
		path = await import('node:path'); // eslint-disable-line unicorn/import-style
		sharp = (await import('sharp')).default; // eslint-disable-line unicorn/no-await-expression-member

		// Import mocked utility functions
		({ calculateRatio } = await import('../lib/calculate-ratio.js'));
		({ checkPathAccessibility } = await import('../lib/check-path-accessibility.js'));
		({ createProgressBarContainer } = await import('../lib/create-progress-bar-container.js'));
		({ formatBytes } = await import('../lib/format-bytes.js'));
		({ getPlural } = await import('../lib/get-plural.js'));
		({ getRelativePath } = await import('../lib/get-relative-path.js'));
		({ log, logProgress, logProgressVerbose } = await import('../lib/log.js'));
		({ parseImageMetadata } = await import('../lib/parse-image-metadata.js'));
		({ programOptions } = await import('../lib/program-options.js'));
		({ showTotal } = await import('../lib/show-total.js'));

		// Set up common mock configurations
		setupCommonMocks();
	});

	function setupCommonMocks() {
		// File system mocks
		fs.promises.readFile.mockResolvedValue(Buffer.from('mock-image-data'));
		fs.promises.writeFile.mockResolvedValue();
		fs.promises.mkdir.mockResolvedValue();

		// Path mocks - set default values, can be overridden in specific tests
		path.parse.mockReturnValue({
			dir: '/output',
			name: 'test',
		});
		path.join.mockReturnValue('/output/test.avif');
		path.dirname.mockReturnValue('/output');

		// Sharp mocks
		const mockSharpInstance = {
			rotate: vi.fn().mockReturnThis(),
			avif: vi.fn().mockReturnThis(),
			webp: vi.fn().mockReturnThis(),
			toBuffer: vi.fn().mockResolvedValue(Buffer.from('processed-image-data')),
		};
		sharp.mockReturnValue(mockSharpInstance);

		// Utility function mocks
		checkPathAccessibility.mockResolvedValue(false);
		calculateRatio.mockReturnValue(25);
		formatBytes.mockReturnValue('1.0 MB');
		getPlural.mockReturnValue('images');
		getRelativePath.mockReturnValue('relative/path/to/file.jpg');
		parseImageMetadata.mockResolvedValue({
			format: 'jpeg',
			pages: 1,
		});

		// Progress bar mocks
		const mockProgressBar = {
			increment: vi.fn(),
		};
		const mockProgressBarContainer = {
			create: vi.fn(() => mockProgressBar),
			update: vi.fn(),
			stop: vi.fn(),
			log: vi.fn(),
		};
		createProgressBarContainer.mockReturnValue(mockProgressBarContainer);

		// Reset program options to default state
		programOptions.isForced = false;
		programOptions.isLossless = false;
		programOptions.shouldConvertToAvif = false;
		programOptions.shouldConvertToWebp = false;
	}

	describe('convert function', () => {
		test('should handle empty filePaths array', async () => {
			await convert({ filePaths: [], config: {} });

			// Should return early without processing
			expect(log).not.toHaveBeenCalled();
			expect(createProgressBarContainer).not.toHaveBeenCalled();
		});

		test('should set up progress bar correctly for single format conversion', async () => {
			programOptions.shouldConvertToAvif = true;
			const filePaths = [
				{ input: '/input/file1.jpg', output: '/output/file1.jpg' },
				{ input: '/input/file2.jpg', output: '/output/file2.jpg' },
			];

			await convert({ filePaths, config: {} });

			expect(createProgressBarContainer).toHaveBeenCalledWith(2);
		});

		test('should set up progress bar correctly for dual format conversion', async () => {
			programOptions.shouldConvertToAvif = true;
			programOptions.shouldConvertToWebp = true;
			const filePaths = [
				{ input: '/input/file1.jpg', output: '/output/file1.jpg' },
			];

			await convert({ filePaths, config: {} });

			expect(createProgressBarContainer).toHaveBeenCalledWith(2); // 1 file * 2 formats
		});

		test('should log conversion start message', async () => {
			programOptions.shouldConvertToAvif = true;
			const filePaths = [
				{ input: '/input/file1.jpg', output: '/output/file1.jpg' },
			];

			await convert({ filePaths, config: {} });

			expect(log).toHaveBeenCalledWith(
				expect.stringContaining('Converting 1'),
			);
		});

		test('should call showTotal with correct size values', async () => {
			programOptions.shouldConvertToAvif = true;
			const filePaths = [
				{ input: '/input/file1.jpg', output: '/output/file1.jpg' },
			];

			await convert({ filePaths, config: {} });

			expect(showTotal).toHaveBeenCalledWith(
				expect.any(Number),
				expect.any(Number),
			);
		});
	});

	describe('AVIF conversion core functionality', () => {
		test('should successfully convert valid JPEG image to AVIF', async () => {
			programOptions.shouldConvertToAvif = true;
			const mockImageBuffer = Buffer.from('mock-jpeg-data');
			const mockProcessedBuffer = Buffer.from('mock-avif-data');

			fs.promises.readFile.mockResolvedValue(mockImageBuffer);
			const mockSharpInstance = {
				rotate: vi.fn().mockReturnThis(),
				avif: vi.fn().mockReturnThis(),
				webp: vi.fn().mockReturnThis(),
				toBuffer: vi.fn().mockResolvedValue(mockProcessedBuffer),
			};
			sharp.mockReturnValue(mockSharpInstance);
			path.join.mockReturnValue('/output/test.avif');

			const filePaths = [
				{ input: '/input/test.jpg', output: '/output/test.jpg' },
			];
			const config = { avif: { lossy: { quality: 80 } } };

			await convert({ filePaths, config });

			expect(fs.promises.readFile).toHaveBeenCalledWith('/input/test.jpg');
			expect(sharp).toHaveBeenCalledWith(mockImageBuffer);
			expect(mockSharpInstance.avif).toHaveBeenCalledWith({ quality: 80 });
			expect(fs.promises.writeFile).toHaveBeenCalledWith('/output/test.avif', mockProcessedBuffer);
		});

		test('should successfully convert valid PNG image to AVIF', async () => {
			programOptions.shouldConvertToAvif = true;
			programOptions.isLossless = true;
			parseImageMetadata.mockResolvedValue({
				format: 'png',
				pages: 1,
			});

			const filePaths = [
				{ input: '/input/test.png', output: '/output/test.png' },
			];
			const config = { avif: { lossless: {} } };

			await convert({ filePaths, config });

			expect(parseImageMetadata).toHaveBeenCalled();
			const mockSharpInstance = sharp.mock.results[0].value;
			expect(mockSharpInstance.avif).toHaveBeenCalledWith({});
			expect(logProgress).toHaveBeenCalledWith(
				expect.any(String),
				expect.objectContaining({
					type: 'success',
					description: expect.stringContaining('AVIF'),
				}),
			);
		});
	});

	describe('WebP conversion core functionality', () => {
		test('should successfully convert valid JPEG image to WebP', async () => {
			programOptions.shouldConvertToWebp = true;
			const mockImageBuffer = Buffer.from('mock-jpeg-data');
			const mockProcessedBuffer = Buffer.from('mock-webp-data');

			fs.promises.readFile.mockResolvedValue(mockImageBuffer);
			const mockSharpInstance = {
				rotate: vi.fn().mockReturnThis(),
				avif: vi.fn().mockReturnThis(),
				webp: vi.fn().mockReturnThis(),
				toBuffer: vi.fn().mockResolvedValue(mockProcessedBuffer),
			};
			sharp.mockReturnValue(mockSharpInstance);
			path.join.mockReturnValue('/output/test.webp');

			const filePaths = [
				{ input: '/input/test.jpg', output: '/output/test.jpg' },
			];
			const config = { webp: { lossy: { quality: 85 } } };

			await convert({ filePaths, config });

			expect(fs.promises.readFile).toHaveBeenCalledWith('/input/test.jpg');
			expect(sharp).toHaveBeenCalledWith(mockImageBuffer, { animated: false });
			expect(mockSharpInstance.webp).toHaveBeenCalledWith({ quality: 85 });
			expect(fs.promises.writeFile).toHaveBeenCalledWith('/output/test.webp', mockProcessedBuffer);
		});

		test('should successfully convert animated GIF to WebP', async () => {
			programOptions.shouldConvertToWebp = true;
			parseImageMetadata.mockResolvedValue({
				format: 'gif',
				pages: 10, // Animated GIF
			});

			const filePaths = [
				{ input: '/input/animated.gif', output: '/output/animated.gif' },
			];
			const config = { webp: { lossy: { quality: 90 } } };

			await convert({ filePaths, config });

			expect(sharp).toHaveBeenCalledWith(
				expect.any(Buffer),
				{ animated: true },
			);
			const mockSharpInstance = sharp.mock.results[0].value;
			expect(mockSharpInstance.webp).toHaveBeenCalledWith({ quality: 90 });
		});
	});

	describe('simultaneous AVIF and WebP conversion', () => {
		test('should convert single image to both AVIF and WebP formats', async () => {
			programOptions.shouldConvertToAvif = true;
			programOptions.shouldConvertToWebp = true;

			const mockImageBuffer = Buffer.from('mock-image-data');
			const mockAvifBuffer = Buffer.from('mock-avif-data');
			const mockWebpBuffer = Buffer.from('mock-webp-data');

			fs.promises.readFile.mockResolvedValue(mockImageBuffer);

			// Mock Sharp to return different buffers for different formats
			const mockSharpInstance = {
				rotate: vi.fn().mockReturnThis(),
				avif: vi.fn().mockReturnThis(),
				webp: vi.fn().mockReturnThis(),
				toBuffer: vi.fn()
					.mockResolvedValueOnce(mockAvifBuffer)
					.mockResolvedValueOnce(mockWebpBuffer),
			};
			sharp.mockReturnValue(mockSharpInstance);

			path.join
				.mockReturnValueOnce('/output/test.avif')
				.mockReturnValueOnce('/output/test.webp');

			const filePaths = [
				{ input: '/input/test.jpg', output: '/output/test.jpg' },
			];
			const config = {
				avif: { lossy: { quality: 80 } },
				webp: { lossy: { quality: 85 } },
			};

			await convert({ filePaths, config });

			// Should read the input file twice (once for each format)
			expect(fs.promises.readFile).toHaveBeenCalledTimes(2);
			expect(fs.promises.readFile).toHaveBeenCalledWith('/input/test.jpg');

			// Should create Sharp instances for both formats
			expect(sharp).toHaveBeenCalledTimes(2);
			expect(mockSharpInstance.avif).toHaveBeenCalledWith({ quality: 80 });
			expect(mockSharpInstance.webp).toHaveBeenCalledWith({ quality: 85 });

			// Should write both output files
			expect(fs.promises.writeFile).toHaveBeenCalledTimes(2);
			expect(fs.promises.writeFile).toHaveBeenCalledWith('/output/test.avif', mockAvifBuffer);
			expect(fs.promises.writeFile).toHaveBeenCalledWith('/output/test.webp', mockWebpBuffer);
		});

		test('should convert multiple images to both AVIF and WebP formats', async () => {
			programOptions.shouldConvertToAvif = true;
			programOptions.shouldConvertToWebp = true;

			const filePaths = [
				{ input: '/input/image1.jpg', output: '/output/image1.jpg' },
				{ input: '/input/image2.png', output: '/output/image2.png' },
			];

			await convert({ filePaths, config: {} });

			// Should process 4 total conversions (2 files × 2 formats)
			expect(fs.promises.readFile).toHaveBeenCalledTimes(4);
			expect(fs.promises.writeFile).toHaveBeenCalledTimes(4);
		});

		test('should handle mixed success and failure in simultaneous conversion', async () => {
			programOptions.shouldConvertToAvif = true;
			programOptions.shouldConvertToWebp = true;

			// Mock AVIF to succeed, WebP to fail
			fs.promises.readFile
				.mockResolvedValueOnce(Buffer.from('mock-data')) // AVIF success
				.mockRejectedValueOnce(new Error('WebP read error')); // WebP failure

			const filePaths = [
				{ input: '/input/test.jpg', output: '/output/test.jpg' },
			];

			await convert({ filePaths, config: {} });

			// Should log both success and error
			expect(logProgress).toHaveBeenCalledWith(
				expect.any(String),
				expect.objectContaining({
					type: 'success',
					description: expect.stringContaining('AVIF'),
				}),
			);
			expect(logProgress).toHaveBeenCalledWith(
				expect.any(String),
				expect.objectContaining({
					type: 'error',
					description: 'WebP read error',
				}),
			);
		});
	});
	describe('progress bar and total calculation logic', () => {
		test('should create progress bar with correct total for single format', async () => {
			programOptions.shouldConvertToAvif = true;
			const filePaths = [
				{ input: '/input/file1.jpg', output: '/output/file1.jpg' },
				{ input: '/input/file2.jpg', output: '/output/file2.jpg' },
				{ input: '/input/file3.jpg', output: '/output/file3.jpg' },
			];

			await convert({ filePaths, config: {} });

			expect(createProgressBarContainer).toHaveBeenCalledWith(3);
			const mockProgressBarContainer = createProgressBarContainer.mock.results[0].value;
			expect(mockProgressBarContainer.create).toHaveBeenCalledWith(3, 0);
		});

		test('should create progress bar with correct total for dual format', async () => {
			programOptions.shouldConvertToAvif = true;
			programOptions.shouldConvertToWebp = true;
			const filePaths = [
				{ input: '/input/file1.jpg', output: '/output/file1.jpg' },
				{ input: '/input/file2.jpg', output: '/output/file2.jpg' },
			];

			await convert({ filePaths, config: {} });

			expect(createProgressBarContainer).toHaveBeenCalledWith(4); // 2 files × 2 formats
			const mockProgressBarContainer = createProgressBarContainer.mock.results[0].value;
			expect(mockProgressBarContainer.create).toHaveBeenCalledWith(4, 0);
		});

		test('should increment progress bar for each processed file', async () => {
			programOptions.shouldConvertToAvif = true;
			const filePaths = [
				{ input: '/input/file1.jpg', output: '/output/file1.jpg' },
				{ input: '/input/file2.jpg', output: '/output/file2.jpg' },
			];

			await convert({ filePaths, config: {} });

			const mockProgressBarContainer = createProgressBarContainer.mock.results[0].value;
			const mockProgressBar = mockProgressBarContainer.create.mock.results[0].value;
			expect(mockProgressBar.increment).toHaveBeenCalledTimes(2);
		});

		test('should update and stop progress bar container', async () => {
			programOptions.shouldConvertToAvif = true;
			const filePaths = [
				{ input: '/input/file1.jpg', output: '/output/file1.jpg' },
			];

			await convert({ filePaths, config: {} });

			const mockProgressBarContainer = createProgressBarContainer.mock.results[0].value;
			expect(mockProgressBarContainer.update).toHaveBeenCalled();
			expect(mockProgressBarContainer.stop).toHaveBeenCalled();
		});

		test('should calculate and accumulate total file sizes correctly', async () => {
			programOptions.shouldConvertToAvif = true;

			const originalSize1 = 1_000_000; // 1MB
			const processedSize1 = 750_000; // 0.75MB
			const originalSize2 = 2_000_000; // 2MB
			const processedSize2 = 1_500_000; // 1.5MB

			fs.promises.readFile
				.mockResolvedValueOnce(Buffer.alloc(originalSize1))
				.mockResolvedValueOnce(Buffer.alloc(originalSize2));

			const mockSharpInstance = {
				rotate: vi.fn().mockReturnThis(),
				avif: vi.fn().mockReturnThis(),
				webp: vi.fn().mockReturnThis(),
				toBuffer: vi.fn()
					.mockResolvedValueOnce(Buffer.alloc(processedSize1))
					.mockResolvedValueOnce(Buffer.alloc(processedSize2)),
			};
			sharp.mockReturnValue(mockSharpInstance);

			const filePaths = [
				{ input: '/input/file1.jpg', output: '/output/file1.jpg' },
				{ input: '/input/file2.jpg', output: '/output/file2.jpg' },
			];

			await convert({ filePaths, config: {} });

			// Should call showTotal with accumulated sizes
			expect(showTotal).toHaveBeenCalledWith(
				originalSize1 + originalSize2, // Total before: 3MB
				processedSize1 + processedSize2, // Total after: 2.25MB
			);
		});

		test('should use smaller size when processed file is larger than original', async () => {
			programOptions.shouldConvertToAvif = true;

			const originalSize = 500_000; // 0.5MB
			const processedSize = 800_000; // 0.8MB (larger than original)

			fs.promises.readFile.mockResolvedValue(Buffer.alloc(originalSize));
			const mockSharpInstance = {
				rotate: vi.fn().mockReturnThis(),
				avif: vi.fn().mockReturnThis(),
				webp: vi.fn().mockReturnThis(),
				toBuffer: vi.fn().mockResolvedValue(Buffer.alloc(processedSize)),
			};
			sharp.mockReturnValue(mockSharpInstance);

			const filePaths = [
				{ input: '/input/file1.jpg', output: '/output/file1.jpg' },
			];

			await convert({ filePaths, config: {} });

			// Should use original size as "after" size when processed is larger
			expect(showTotal).toHaveBeenCalledWith(
				originalSize, // Total before: 0.5MB
				originalSize, // Total after: 0.5MB (not 0.8MB)
			);
		});
	});

	describe('processFile function', () => {
		test('should skip existing files when not forced', async () => {
			programOptions.shouldConvertToAvif = true;
			programOptions.isForced = false;
			checkPathAccessibility.mockResolvedValue(true); // File exists

			const filePaths = [
				{ input: '/input/file1.jpg', output: '/output/file1.jpg' },
			];

			await convert({ filePaths, config: {} });

			expect(logProgressVerbose).toHaveBeenCalledWith(
				expect.any(String),
				expect.objectContaining({
					description: expect.stringContaining('File already exists'),
				}),
			);
		});

		test('should process files when forced', async () => {
			programOptions.shouldConvertToAvif = true;
			programOptions.isForced = true;
			checkPathAccessibility.mockResolvedValue(true); // File exists

			const filePaths = [
				{ input: '/input/file1.jpg', output: '/output/file1.jpg' },
			];

			await convert({ filePaths, config: {} });

			expect(fs.promises.readFile).toHaveBeenCalled();
			expect(fs.promises.writeFile).toHaveBeenCalled();
		});

		test('should handle file processing errors', async () => {
			programOptions.shouldConvertToAvif = true;
			fs.promises.readFile.mockRejectedValue(new Error('File read error'));

			const filePaths = [
				{ input: '/input/file1.jpg', output: '/output/file1.jpg' },
			];

			await convert({ filePaths, config: {} });

			expect(logProgress).toHaveBeenCalledWith(
				expect.any(String),
				expect.objectContaining({
					type: 'error',
					description: 'File read error',
				}),
			);
		});
	});

	describe('processAvif function', () => {
		test('should reject animated images for AVIF', async () => {
			programOptions.shouldConvertToAvif = true;
			parseImageMetadata.mockResolvedValue({
				format: 'gif',
				pages: 5, // Animated
			});

			const filePaths = [
				{ input: '/input/animated.gif', output: '/output/animated.gif' },
			];

			await convert({ filePaths, config: {} });

			expect(logProgress).toHaveBeenCalledWith(
				expect.any(String),
				expect.objectContaining({
					type: 'error',
					description: 'Animated AVIF is not supported',
				}),
			);
		});

		test('should process static images for AVIF', async () => {
			programOptions.shouldConvertToAvif = true;
			parseImageMetadata.mockResolvedValue({
				format: 'jpeg',
				pages: 1, // Static
			});

			const filePaths = [
				{ input: '/input/static.jpg', output: '/output/static.jpg' },
			];

			await convert({ filePaths, config: {} });

			const sharpInstance = sharp.mock.results[0].value;
			expect(sharpInstance.rotate).toHaveBeenCalled();
			expect(sharpInstance.avif).toHaveBeenCalled();
			expect(sharpInstance.toBuffer).toHaveBeenCalled();
		});
	});

	describe('processWebp function', () => {
		test('should handle animated images for WebP', async () => {
			programOptions.shouldConvertToWebp = true;
			parseImageMetadata.mockResolvedValue({
				format: 'gif',
				pages: 5, // Animated
			});

			const filePaths = [
				{ input: '/input/animated.gif', output: '/output/animated.gif' },
			];

			await convert({ filePaths, config: {} });

			expect(sharp).toHaveBeenCalledWith(
				expect.any(Buffer),
				{ animated: true },
			);
		});

		test('should handle static images for WebP', async () => {
			programOptions.shouldConvertToWebp = true;
			parseImageMetadata.mockResolvedValue({
				format: 'jpeg',
				pages: 1, // Static
			});

			const filePaths = [
				{ input: '/input/static.jpg', output: '/output/static.jpg' },
			];

			await convert({ filePaths, config: {} });

			expect(sharp).toHaveBeenCalledWith(
				expect.any(Buffer),
				{ animated: false },
			);
		});
	});

	describe('checkImageFormat function', () => {
		test('should handle unknown image format', async () => {
			programOptions.shouldConvertToAvif = true;
			parseImageMetadata.mockResolvedValue({
				format: undefined, // Unknown format
				pages: 1,
			});

			const filePaths = [
				{ input: '/input/unknown.file', output: '/output/unknown.file' },
			];

			await convert({ filePaths, config: {} });

			expect(logProgress).toHaveBeenCalledWith(
				expect.any(String),
				expect.objectContaining({
					type: 'error',
					description: 'Unknown file format',
				}),
			);
		});

		test('should handle unsupported image format', async () => {
			programOptions.shouldConvertToAvif = true;
			parseImageMetadata.mockResolvedValue({
				format: 'bmp', // Unsupported format
				pages: 1,
			});

			const filePaths = [
				{ input: '/input/file.bmp', output: '/output/file.bmp' },
			];

			await convert({ filePaths, config: {} });

			expect(logProgress).toHaveBeenCalledWith(
				expect.any(String),
				expect.objectContaining({
					type: 'error',
					description: 'Unsupported image format: "bmp"',
				}),
			);
		});
	});
	describe('error handling and edge cases', () => {
		test('should handle empty filePaths array with early return', async () => {
			await convert({ filePaths: [], config: {} });

			// Should return early without any processing
			expect(log).not.toHaveBeenCalled();
			expect(createProgressBarContainer).not.toHaveBeenCalled();
			expect(fs.promises.readFile).not.toHaveBeenCalled();
		});

		test('should handle file read errors gracefully', async () => {
			programOptions.shouldConvertToAvif = true;
			fs.promises.readFile.mockRejectedValue(new Error('Permission denied'));

			const filePaths = [
				{ input: '/input/protected.jpg', output: '/output/protected.jpg' },
			];

			await convert({ filePaths, config: {} });

			expect(logProgress).toHaveBeenCalledWith(
				expect.any(String),
				expect.objectContaining({
					type: 'error',
					description: 'Permission denied',
				}),
			);
		});

		test('should handle file write errors gracefully', async () => {
			programOptions.shouldConvertToWebp = true;
			fs.promises.writeFile.mockRejectedValue(new Error('Disk full'));

			const filePaths = [
				{ input: '/input/test.jpg', output: '/output/test.jpg' },
			];

			await convert({ filePaths, config: {} });

			expect(logProgress).toHaveBeenCalledWith(
				expect.any(String),
				expect.objectContaining({
					type: 'error',
					description: 'Disk full',
				}),
			);
		});

		test('should handle mkdir errors gracefully', async () => {
			programOptions.shouldConvertToAvif = true;
			fs.promises.mkdir.mockRejectedValue(new Error('Cannot create directory'));

			const filePaths = [
				{ input: '/input/test.jpg', output: '/output/nested/deep/test.jpg' },
			];

			await convert({ filePaths, config: {} });

			expect(logProgress).toHaveBeenCalledWith(
				expect.any(String),
				expect.objectContaining({
					type: 'error',
					description: 'Cannot create directory',
				}),
			);
		});

		test('should handle Sharp processing errors for AVIF', async () => {
			programOptions.shouldConvertToAvif = true;
			const mockSharpInstance = {
				rotate: vi.fn().mockReturnThis(),
				avif: vi.fn().mockReturnThis(),
				webp: vi.fn().mockReturnThis(),
				toBuffer: vi.fn().mockRejectedValue(new Error('Sharp processing failed')),
			};
			sharp.mockReturnValue(mockSharpInstance);

			const filePaths = [
				{ input: '/input/corrupted.jpg', output: '/output/corrupted.jpg' },
			];

			await convert({ filePaths, config: {} });

			expect(logProgress).toHaveBeenCalledWith(
				expect.any(String),
				expect.objectContaining({
					type: 'error',
					description: 'Sharp processing failed',
				}),
			);
		});

		test('should handle Sharp processing errors for WebP', async () => {
			programOptions.shouldConvertToWebp = true;
			const mockSharpInstance = {
				rotate: vi.fn().mockReturnThis(),
				avif: vi.fn().mockReturnThis(),
				webp: vi.fn().mockReturnThis(),
				toBuffer: vi.fn().mockRejectedValue(new Error('WebP encoding failed')),
			};
			sharp.mockReturnValue(mockSharpInstance);

			const filePaths = [
				{ input: '/input/invalid.png', output: '/output/invalid.png' },
			];

			await convert({ filePaths, config: {} });

			expect(logProgress).toHaveBeenCalledWith(
				expect.any(String),
				expect.objectContaining({
					type: 'error',
					description: 'WebP encoding failed',
				}),
			);
		});

		test('should handle parseImageMetadata errors', async () => {
			programOptions.shouldConvertToAvif = true;
			parseImageMetadata.mockRejectedValue(new Error('Cannot parse image metadata'));

			const filePaths = [
				{ input: '/input/malformed.jpg', output: '/output/malformed.jpg' },
			];

			await convert({ filePaths, config: {} });

			expect(logProgress).toHaveBeenCalledWith(
				expect.any(String),
				expect.objectContaining({
					type: 'error',
					description: 'Cannot parse image metadata',
				}),
			);
		});

		test('should handle errors without message property', async () => {
			programOptions.shouldConvertToAvif = true;
			const errorWithoutMessage = new Error(); // eslint-disable-line unicorn/error-message
			errorWithoutMessage.message = '';
			fs.promises.readFile.mockRejectedValue(errorWithoutMessage);

			const mockProgressBarContainer = {
				create: vi.fn(() => ({ increment: vi.fn() })),
				update: vi.fn(),
				stop: vi.fn(),
				log: vi.fn(),
			};
			createProgressBarContainer.mockReturnValue(mockProgressBarContainer);

			const filePaths = [
				{ input: '/input/test.jpg', output: '/output/test.jpg' },
			];

			await convert({ filePaths, config: {} });

			expect(mockProgressBarContainer.log).toHaveBeenCalledWith(errorWithoutMessage);
		});

		test('should handle errors with undefined message property', async () => {
			programOptions.shouldConvertToAvif = true;
			const errorWithUndefinedMessage = { name: 'CustomError' }; // Object without message property
			fs.promises.readFile.mockRejectedValue(errorWithUndefinedMessage);

			const mockProgressBarContainer = {
				create: vi.fn(() => ({ increment: vi.fn() })),
				update: vi.fn(),
				stop: vi.fn(),
				log: vi.fn(),
			};
			createProgressBarContainer.mockReturnValue(mockProgressBarContainer);

			const filePaths = [
				{ input: '/input/test.jpg', output: '/output/test.jpg' },
			];

			await convert({ filePaths, config: {} });

			expect(mockProgressBarContainer.log).toHaveBeenCalledWith(errorWithUndefinedMessage);
		});

		test('should handle errors with null message property', async () => {
			programOptions.shouldConvertToAvif = true;
			const errorWithNullMessage = new Error('test');
			errorWithNullMessage.message = undefined;
			fs.promises.readFile.mockRejectedValue(errorWithNullMessage);

			const mockProgressBarContainer = {
				create: vi.fn(() => ({ increment: vi.fn() })),
				update: vi.fn(),
				stop: vi.fn(),
				log: vi.fn(),
			};
			createProgressBarContainer.mockReturnValue(mockProgressBarContainer);

			const filePaths = [
				{ input: '/input/test.jpg', output: '/output/test.jpg' },
			];

			await convert({ filePaths, config: {} });

			expect(mockProgressBarContainer.log).toHaveBeenCalledWith(errorWithNullMessage);
		});

		test('should handle error message fallback when message is truthy but undefined during processing', async () => {
			programOptions.shouldConvertToAvif = true;
			// Create an error object with a message property that becomes undefined during processing
			const errorWithFallback = {
				message: 'initial message',
				toString: () => 'Error object',
			};
			// Override the message property to be undefined after the initial check
			Object.defineProperty(errorWithFallback, 'message', {
				// eslint-disable-next-line getter-return
				get() {
					// First call returns truthy value, subsequent calls return undefined
					if (!this._called) {
						this._called = true;
						return 'truthy message';
					}
				},
				configurable: true,
			});

			fs.promises.readFile.mockRejectedValue(errorWithFallback);

			const filePaths = [
				{ input: '/input/test.jpg', output: '/output/test.jpg' },
			];

			await convert({ filePaths, config: {} });

			expect(logProgress).toHaveBeenCalledWith(
				expect.any(String),
				expect.objectContaining({
					type: 'error',
					description: '', // Should be empty string due to fallback
				}),
			);
		});

		test('should increment progress bar even when errors occur', async () => {
			programOptions.shouldConvertToAvif = true;
			fs.promises.readFile.mockRejectedValue(new Error('File error'));

			const filePaths = [
				{ input: '/input/error1.jpg', output: '/output/error1.jpg' },
				{ input: '/input/error2.jpg', output: '/output/error2.jpg' },
			];

			await convert({ filePaths, config: {} });

			const mockProgressBarContainer = createProgressBarContainer.mock.results[0].value;
			const mockProgressBar = mockProgressBarContainer.create.mock.results[0].value;
			expect(mockProgressBar.increment).toHaveBeenCalledTimes(2);
		});
	});
});
