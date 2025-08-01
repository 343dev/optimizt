import {
	beforeEach, describe, expect, test, vi,
} from 'vitest';

import { optimize } from '../optimize.js';

// vi.mock() required for Node.js built-in modules
vi.mock('node:child_process', () => ({
	spawn: vi.fn(),
}));

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
		default: {
			...actual,
			extname: vi.fn(),
			dirname: vi.fn(),
		},
		...actual,
		extname: vi.fn(),
		dirname: vi.fn(),
	};
});

// vi.mock() required for external dependencies
vi.mock('@343dev/gifsicle', () => ({
	default: '/mock/path/to/gifsicle',
}));

vi.mock('@343dev/guetzli', () => ({
	default: '/mock/path/to/guetzli',
}));

vi.mock('p-limit', () => ({
	default: vi.fn(_limit => function_ => function_()), // eslint-disable-line unicorn/consistent-function-scoping
}));

vi.mock('sharp', () => ({
	default: vi.fn(() => ({
		rotate: vi.fn().mockReturnThis(),
		jpeg: vi.fn().mockReturnThis(),
		png: vi.fn().mockReturnThis(),
		toColorspace: vi.fn().mockReturnThis(),
		toBuffer: vi.fn(),
	})),
}));

vi.mock('svgo', () => ({
	optimize: vi.fn(),
}));

// vi.mock() required for utility functions due to complex module interdependencies
vi.mock('../lib/calculate-ratio.js', () => ({
	calculateRatio: vi.fn(),
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

vi.mock('../lib/options-to-arguments.js', () => ({
	optionsToArguments: vi.fn(),
}));

vi.mock('../lib/parse-image-metadata.js', () => ({
	parseImageMetadata: vi.fn(),
}));

vi.mock('../lib/program-options.js', () => ({
	programOptions: {
		isLossless: false,
	},
}));

vi.mock('../lib/show-total.js', () => ({
	showTotal: vi.fn(),
}));

describe('optimize', () => {
	// Import mocked modules for test setup
	let spawn;
	let fs;
	let os;
	let path;
	let gifsicle;
	let pLimit;
	let sharp;
	let svgoOptimize;
	let calculateRatio;
	let createProgressBarContainer;
	let formatBytes;
	let getPlural;
	let getRelativePath;
	let log;
	let logProgress;
	let logProgressVerbose;
	let optionsToArguments;
	let parseImageMetadata;
	let programOptions;
	let showTotal;

	beforeEach(async () => {
		// Clear all mocks before each test
		vi.clearAllMocks();

		// Import mocked modules
		({ spawn } = await import('node:child_process'));
		fs = await import('node:fs');
		os = await import('node:os');
		path = await import('node:path'); // eslint-disable-line unicorn/import-style

		// Import mocked external dependencies
		const gifsicleModule = await import('@343dev/gifsicle');
		gifsicle = gifsicleModule.default;
		const pLimitModule = await import('p-limit');
		pLimit = pLimitModule.default;
		const sharpModule = await import('sharp');
		sharp = sharpModule.default;
		({ optimize: svgoOptimize } = await import('svgo'));

		// Import mocked utility functions
		({ calculateRatio } = await import('../lib/calculate-ratio.js'));
		({ createProgressBarContainer } = await import('../lib/create-progress-bar-container.js'));
		({ formatBytes } = await import('../lib/format-bytes.js'));
		({ getPlural } = await import('../lib/get-plural.js'));
		({ getRelativePath } = await import('../lib/get-relative-path.js'));
		({ log, logProgress, logProgressVerbose } = await import('../lib/log.js'));
		({ optionsToArguments } = await import('../lib/options-to-arguments.js'));
		({ parseImageMetadata } = await import('../lib/parse-image-metadata.js'));
		({ programOptions } = await import('../lib/program-options.js'));
		({ showTotal } = await import('../lib/show-total.js'));

		// Set up common mock configurations
		setupCommonMocks();
	});

	function setupCommonMocks() {
		// File system mocks
		const mockImageBuffer = Buffer.from('mock-image-data');
		fs.promises.readFile.mockResolvedValue(mockImageBuffer);
		fs.promises.writeFile.mockResolvedValue();
		fs.promises.mkdir.mockResolvedValue();

		// Path mocks
		path.extname.mockReturnValue('.jpg');
		path.dirname.mockReturnValue('/mock/output/dir');

		// OS mocks
		os.cpus.mockReturnValue(Array.from({ length: 4 }).fill({}));

		// Sharp mocks - ensure proper chaining
		const mockToBuffer = vi.fn().mockResolvedValue(Buffer.from('processed-image-data'));
		const mockSharpInstance = {
			rotate: vi.fn().mockReturnThis(),
			jpeg: vi.fn().mockReturnThis(),
			png: vi.fn().mockReturnThis(),
			toColorspace: vi.fn().mockReturnThis(),
			toBuffer: mockToBuffer,
		};
		sharp.mockReturnValue(mockSharpInstance);

		// SVGO mocks
		svgoOptimize.mockReturnValue({
			data: 'optimized-svg-data',
		});

		// Spawn mocks for external commands
		const mockProcess = {
			stdin: {
				write: vi.fn(),
				end: vi.fn(),
			},
			stdout: {
				on: vi.fn((event, callback) => {
					if (event === 'data') {
						// Simulate data chunks
						callback(Buffer.from('processed-data-chunk'));
					}
				}),
			},
			on: vi.fn((event, callback) => {
				if (event === 'close') {
					// Simulate successful process completion
					callback(0);
				}
			}),
		};
		spawn.mockReturnValue(mockProcess);

		// Utility function mocks
		calculateRatio.mockReturnValue(25);
		formatBytes.mockReturnValue('1.0 MB');
		getPlural.mockReturnValue('images');
		getRelativePath.mockReturnValue('relative/path/to/file.jpg');
		parseImageMetadata.mockResolvedValue({
			format: 'jpeg',
		});
		optionsToArguments.mockReturnValue(['--quality', '80']);

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
		programOptions.isLossless = false;

		// pLimit mock - return the function directly to execute it
		pLimit.mockImplementation(_limit => function_ => Promise.resolve(function_())); // eslint-disable-line unicorn/consistent-function-scoping
	}

	describe('optimize function', () => {
		test('should handle empty filePaths array', async () => {
			await optimize({ filePaths: [], config: {} });

			// Should return early without processing
			expect(log).not.toHaveBeenCalled();
			expect(createProgressBarContainer).not.toHaveBeenCalled();
		});

		test('should set up progress bar correctly', async () => {
			const filePaths = [
				{ input: '/input/file1.jpg', output: '/output/file1.jpg' },
				{ input: '/input/file2.png', output: '/output/file2.png' },
			];

			await optimize({ filePaths, config: {} });

			expect(createProgressBarContainer).toHaveBeenCalledWith(2);
		});

		test('should log optimization start message for lossy mode', async () => {
			programOptions.isLossless = false;
			const filePaths = [
				{ input: '/input/file1.jpg', output: '/output/file1.jpg' },
			];

			await optimize({ filePaths, config: {} });

			expect(log).toHaveBeenCalledWith(
				expect.stringContaining('Optimizing 1'),
			);
			expect(log).toHaveBeenCalledWith(
				expect.stringContaining('(lossy)'),
			);
		});

		test('should log optimization start message for lossless mode', async () => {
			programOptions.isLossless = true;
			const filePaths = [
				{ input: '/input/file1.jpg', output: '/output/file1.jpg' },
			];

			await optimize({ filePaths, config: {} });

			expect(log).toHaveBeenCalledWith(
				expect.stringContaining('Optimizing 1'),
			);
			expect(log).toHaveBeenCalledWith(
				expect.stringContaining('(lossless)'),
			);
		});

		test('should call showTotal with correct size values', async () => {
			const filePaths = [
				{ input: '/input/file1.jpg', output: '/output/file1.jpg' },
			];

			await optimize({ filePaths, config: {} });

			expect(showTotal).toHaveBeenCalledWith(
				expect.any(Number),
				expect.any(Number),
			);
		});

		test('should update and stop progress bar container', async () => {
			const filePaths = [
				{ input: '/input/file1.jpg', output: '/output/file1.jpg' },
			];

			await optimize({ filePaths, config: {} });

			const mockProgressBarContainer = createProgressBarContainer.mock.results[0].value;
			expect(mockProgressBarContainer.update).toHaveBeenCalled();
			expect(mockProgressBarContainer.stop).toHaveBeenCalled();
		});
	});

	describe('concurrency and task limiting', () => {
		test('should use CPU-based concurrency for non-JPEG files', async () => {
			path.extname.mockReturnValue('.png');
			const filePaths = [
				{ input: '/input/file1.png', output: '/output/file1.png' },
			];

			await optimize({ filePaths, config: {} });

			expect(pLimit).toHaveBeenCalledWith(4); // CPU count
		});

		test('should use CPU-based concurrency for lossy JPEG files', async () => {
			path.extname.mockReturnValue('.jpg');
			programOptions.isLossless = false;
			const filePaths = [
				{ input: '/input/file1.jpg', output: '/output/file1.jpg' },
			];

			await optimize({ filePaths, config: {} });

			expect(pLimit).toHaveBeenCalledWith(4); // CPU count
		});

		test('should use single-instance limit for lossless JPEG files (Guetzli)', async () => {
			path.extname.mockReturnValue('.jpeg');
			programOptions.isLossless = true;
			const filePaths = [
				{ input: '/input/file1.jpeg', output: '/output/file1.jpeg' },
			];

			await optimize({ filePaths, config: {} });

			expect(pLimit).toHaveBeenCalledWith(1); // Guetzli limitation
		});
	});

	describe('processFile function', () => {
		test('should read input file', async () => {
			const filePaths = [
				{ input: '/input/test.jpg', output: '/output/test.jpg' },
			];

			await optimize({ filePaths, config: {} });

			expect(fs.promises.readFile).toHaveBeenCalledWith('/input/test.jpg');
		});

		test('should create output directory', async () => {
			// Set up mocks to ensure file processing and directory creation happens
			const originalBuffer = Buffer.from('original-data');
			const optimizedBuffer = Buffer.from('optimized-data');

			fs.promises.readFile.mockResolvedValue(originalBuffer);
			parseImageMetadata.mockResolvedValue({ format: 'jpeg' });

			// Set up Sharp mock to return the optimized buffer
			const mockSharpInstance = {
				rotate: vi.fn().mockReturnThis(),
				jpeg: vi.fn().mockReturnThis(),
				toBuffer: vi.fn().mockResolvedValue(optimizedBuffer),
			};
			sharp.mockReturnValue(mockSharpInstance);

			calculateRatio.mockReturnValue(25); // 25% reduction to trigger file write
			path.dirname.mockReturnValue('/deep/nested/output/dir');

			// Mock buffer.equals to return false so files are considered different
			vi.spyOn(originalBuffer, 'equals').mockReturnValue(false);

			const filePaths = [
				{ input: '/input/test.jpg', output: '/deep/nested/output/dir/test.jpg' },
			];

			await optimize({ filePaths, config: {} });

			expect(fs.promises.mkdir).toHaveBeenCalledWith(
				'/deep/nested/output/dir',
				{ recursive: true },
			);
		});

		test('should write optimized file when optimization is successful', async () => {
			const originalBuffer = Buffer.from('original-data');
			const optimizedBuffer = Buffer.from('optimized-data');

			fs.promises.readFile.mockResolvedValue(originalBuffer);
			parseImageMetadata.mockResolvedValue({ format: 'jpeg' });

			// Set up Sharp mock to return the optimized buffer
			const mockSharpInstance = {
				rotate: vi.fn().mockReturnThis(),
				jpeg: vi.fn().mockReturnThis(),
				toBuffer: vi.fn().mockResolvedValue(optimizedBuffer),
			};
			sharp.mockReturnValue(mockSharpInstance);

			calculateRatio.mockReturnValue(25); // 25% reduction

			// Mock buffer.equals to return false so files are considered different
			vi.spyOn(originalBuffer, 'equals').mockReturnValue(false);

			const filePaths = [
				{ input: '/input/test.jpg', output: '/output/test.jpg' },
			];

			await optimize({ filePaths, config: {} });

			expect(fs.promises.writeFile).toHaveBeenCalledWith(
				'/output/test.jpg',
				optimizedBuffer,
			);
		});

		test('should skip file when no optimization achieved', async () => {
			const originalBuffer = Buffer.from('original-data');
			const sameBuffer = Buffer.from('original-data'); // Same content

			fs.promises.readFile.mockResolvedValue(originalBuffer);
			parseImageMetadata.mockResolvedValue({ format: 'jpeg' });

			// Set up Sharp mock to return the same buffer
			const mockSharpInstance = {
				rotate: vi.fn().mockReturnThis(),
				jpeg: vi.fn().mockReturnThis(),
				toBuffer: vi.fn().mockResolvedValue(sameBuffer),
			};
			sharp.mockReturnValue(mockSharpInstance);

			calculateRatio.mockReturnValue(0); // No reduction

			// Mock buffer.equals to return true so files are considered the same
			vi.spyOn(originalBuffer, 'equals').mockReturnValue(true);

			const filePaths = [
				{ input: '/input/test.jpg', output: '/output/test.jpg' },
			];

			await optimize({ filePaths, config: {} });

			expect(fs.promises.writeFile).not.toHaveBeenCalled();
			expect(logProgressVerbose).toHaveBeenCalledWith(
				expect.any(String),
				expect.objectContaining({
					description: expect.stringContaining('Nothing changed'),
				}),
			);
		});

		test('should increment progress bar for each processed file', async () => {
			const filePaths = [
				{ input: '/input/file1.jpg', output: '/output/file1.jpg' },
				{ input: '/input/file2.jpg', output: '/output/file2.jpg' },
			];

			await optimize({ filePaths, config: {} });

			const mockProgressBarContainer = createProgressBarContainer.mock.results[0].value;
			const mockProgressBar = mockProgressBarContainer.create.mock.results[0].value;
			expect(mockProgressBar.increment).toHaveBeenCalledTimes(2);
		});
	});

	describe('processFileByFormat function', () => {
		test('should route JPEG files to JPEG processor', async () => {
			parseImageMetadata.mockResolvedValue({ format: 'jpeg' });
			const filePaths = [
				{ input: '/input/test.jpg', output: '/output/test.jpg' },
			];

			await optimize({ filePaths, config: {} });

			expect(parseImageMetadata).toHaveBeenCalled();
			expect(sharp).toHaveBeenCalled();
		});

		test('should route PNG files to PNG processor', async () => {
			parseImageMetadata.mockResolvedValue({ format: 'png' });
			const filePaths = [
				{ input: '/input/test.png', output: '/output/test.png' },
			];

			await optimize({ filePaths, config: {} });

			expect(parseImageMetadata).toHaveBeenCalled();
			expect(sharp).toHaveBeenCalled();
		});

		test('should route GIF files to GIF processor', async () => {
			parseImageMetadata.mockResolvedValue({ format: 'gif' });
			const filePaths = [
				{ input: '/input/test.gif', output: '/output/test.gif' },
			];

			await optimize({ filePaths, config: {} });

			expect(parseImageMetadata).toHaveBeenCalled();
			expect(spawn).toHaveBeenCalledWith(
				gifsicle,
				expect.arrayContaining(['--threads=4', '--no-warnings', '-']),
			);
		});

		test('should route SVG files to SVG processor', async () => {
			parseImageMetadata.mockResolvedValue({ format: 'svg' });
			const filePaths = [
				{ input: '/input/test.svg', output: '/output/test.svg' },
			];

			await optimize({ filePaths, config: {} });

			expect(parseImageMetadata).toHaveBeenCalled();
			expect(svgoOptimize).toHaveBeenCalled();
		});

		test('should handle unknown image format', async () => {
			parseImageMetadata.mockResolvedValue({ format: undefined });
			const filePaths = [
				{ input: '/input/unknown.file', output: '/output/unknown.file' },
			];

			await optimize({ filePaths, config: {} });

			expect(logProgress).toHaveBeenCalledWith(
				expect.any(String),
				expect.objectContaining({
					type: 'error',
					description: 'Unknown file format',
				}),
			);
		});

		test('should handle unsupported image format', async () => {
			parseImageMetadata.mockResolvedValue({ format: 'bmp' });
			const filePaths = [
				{ input: '/input/test.bmp', output: '/output/test.bmp' },
			];

			await optimize({ filePaths, config: {} });

			expect(logProgress).toHaveBeenCalledWith(
				expect.any(String),
				expect.objectContaining({
					type: 'error',
					description: 'Unsupported image format: "bmp"',
				}),
			);
		});
	});

	describe('error handling', () => {
		test('should handle file read errors gracefully', async () => {
			fs.promises.readFile.mockRejectedValue(new Error('File not found'));
			const filePaths = [
				{ input: '/input/missing.jpg', output: '/output/missing.jpg' },
			];

			await optimize({ filePaths, config: {} });

			expect(logProgress).toHaveBeenCalledWith(
				expect.any(String),
				expect.objectContaining({
					type: 'error',
					description: 'File not found',
				}),
			);
		});

		test('should handle file write errors gracefully', async () => {
			// Set up mocks to get to the file write stage
			const originalBuffer = Buffer.from('original-data');
			const optimizedBuffer = Buffer.from('optimized-data');

			fs.promises.readFile.mockResolvedValue(originalBuffer);
			parseImageMetadata.mockResolvedValue({ format: 'jpeg' });

			// Set up Sharp mock to return the optimized buffer
			const mockSharpInstance = {
				rotate: vi.fn().mockReturnThis(),
				jpeg: vi.fn().mockReturnThis(),
				toBuffer: vi.fn().mockResolvedValue(optimizedBuffer),
			};
			sharp.mockReturnValue(mockSharpInstance);

			calculateRatio.mockReturnValue(25); // 25% reduction to trigger file write
			vi.spyOn(originalBuffer, 'equals').mockReturnValue(false);
			fs.promises.writeFile.mockRejectedValue(new Error('Permission denied'));

			const filePaths = [
				{ input: '/input/test.jpg', output: '/output/test.jpg' },
			];

			await optimize({ filePaths, config: {} });

			expect(logProgress).toHaveBeenCalledWith(
				expect.any(String),
				expect.objectContaining({
					type: 'error',
					description: 'Permission denied',
				}),
			);
		});

		test('should handle Sharp processing errors', async () => {
			const originalBuffer = Buffer.from('original-data');

			fs.promises.readFile.mockResolvedValue(originalBuffer);
			parseImageMetadata.mockResolvedValue({ format: 'jpeg' });
			sharp().toBuffer.mockRejectedValue(new Error('Sharp processing failed'));

			const filePaths = [
				{ input: '/input/corrupted.jpg', output: '/output/corrupted.jpg' },
			];

			await optimize({ filePaths, config: {} });

			expect(logProgress).toHaveBeenCalledWith(
				expect.any(String),
				expect.objectContaining({
					type: 'error',
					description: 'Sharp processing failed',
				}),
			);
		});

		test('should handle spawn process errors in pipe function', async () => {
			const originalBuffer = Buffer.from('original-data');

			fs.promises.readFile.mockResolvedValue(originalBuffer);
			parseImageMetadata.mockResolvedValue({ format: 'gif' });

			// Mock spawn to return a process that emits an error
			const mockProcess = {
				stdin: {
					write: vi.fn(),
					end: vi.fn(),
				},
				stdout: {
					on: vi.fn(),
				},
				on: vi.fn((event, callback) => {
					if (event === 'error') {
						// Simulate process error
						setTimeout(() => callback(new Error('Command not found')), 0);
					}
				}),
			};
			spawn.mockReturnValue(mockProcess);

			const filePaths = [
				{ input: '/input/test.gif', output: '/output/test.gif' },
			];

			await optimize({ filePaths, config: {} });

			expect(logProgress).toHaveBeenCalledWith(
				expect.any(String),
				expect.objectContaining({
					type: 'error',
					description: 'Error processing image: Command not found',
				}),
			);
		});

		test('should handle spawn process non-zero exit codes in pipe function', async () => {
			const originalBuffer = Buffer.from('original-data');

			fs.promises.readFile.mockResolvedValue(originalBuffer);
			parseImageMetadata.mockResolvedValue({ format: 'gif' });

			// Mock spawn to return a process that exits with non-zero code
			const mockProcess = {
				stdin: {
					write: vi.fn(),
					end: vi.fn(),
				},
				stdout: {
					on: vi.fn(),
				},
				on: vi.fn((event, callback) => {
					if (event === 'close') {
						// Simulate process exit with error code
						setTimeout(() => callback(1), 0);
					}
				}),
			};
			spawn.mockReturnValue(mockProcess);

			const filePaths = [
				{ input: '/input/test.gif', output: '/output/test.gif' },
			];

			await optimize({ filePaths, config: {} });

			expect(logProgress).toHaveBeenCalledWith(
				expect.any(String),
				expect.objectContaining({
					type: 'error',
					description: 'Image optimization process exited with code 1',
				}),
			);
		});

		test('should handle errors without message property', async () => {
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

			await optimize({ filePaths, config: {} });

			expect(mockProgressBarContainer.log).toHaveBeenCalledWith(errorWithoutMessage);
		});

		test('should increment progress bar even when errors occur', async () => {
			fs.promises.readFile.mockRejectedValue(new Error('File error'));
			const filePaths = [
				{ input: '/input/error1.jpg', output: '/output/error1.jpg' },
				{ input: '/input/error2.jpg', output: '/output/error2.jpg' },
			];

			await optimize({ filePaths, config: {} });

			const mockProgressBarContainer = createProgressBarContainer.mock.results[0].value;
			const mockProgressBar = mockProgressBarContainer.create.mock.results[0].value;
			expect(mockProgressBar.increment).toHaveBeenCalledTimes(2);
		});

		test('should handle errors with falsy message property', async () => {
			const errorWithFalsyMessage = new Error('Test error');
			errorWithFalsyMessage.message = undefined;
			fs.promises.readFile.mockRejectedValue(errorWithFalsyMessage);

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

			await optimize({ filePaths, config: {} });

			expect(mockProgressBarContainer.log).toHaveBeenCalledWith(errorWithFalsyMessage);
		});

		test('should handle errors with undefined message property', async () => {
			const errorWithUndefinedMessage = {};
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

			await optimize({ filePaths, config: {} });

			expect(mockProgressBarContainer.log).toHaveBeenCalledWith(errorWithUndefinedMessage);
		});
	});

	describe('edge cases and branch coverage', () => {
		test('should handle SVG files with no changes correctly', async () => {
			const originalBuffer = Buffer.from('original-svg-data');
			const _processedBuffer = Buffer.from('original-svg-data'); // Same data

			fs.promises.readFile.mockResolvedValue(originalBuffer);
			parseImageMetadata.mockResolvedValue({ format: 'svg' });

			// Mock path.extname to return .svg
			path.extname.mockReturnValue('.svg');

			// Mock SVGO to return same data (no optimization)
			svgoOptimize.mockReturnValue({
				data: 'original-svg-data',
			});

			// Mock buffer equals to return true (no change)
			vi.spyOn(originalBuffer, 'equals').mockReturnValue(true);
			calculateRatio.mockReturnValue(0); // No compression

			const filePaths = [
				{ input: '/input/test.svg', output: '/output/test.svg' },
			];

			await optimize({ filePaths, config: {} });

			// Should skip file due to no changes and SVG format
			expect(logProgressVerbose).toHaveBeenCalledWith(
				expect.any(String),
				expect.objectContaining({
					description: 'Nothing changed. Skipped',
				}),
			);
			expect(fs.promises.writeFile).not.toHaveBeenCalled();
		});

		test('should handle SVG files with changes correctly', async () => {
			const originalBuffer = Buffer.from('original-svg-data');
			const _processedBuffer = Buffer.from('optimized-svg-data');

			fs.promises.readFile.mockResolvedValue(originalBuffer);
			parseImageMetadata.mockResolvedValue({ format: 'svg' });

			// Mock path.extname to return .svg
			path.extname.mockReturnValue('.svg');

			// Mock SVGO to return optimized data
			svgoOptimize.mockReturnValue({
				data: 'optimized-svg-data',
			});

			// Mock buffer equals to return false (changed)
			vi.spyOn(originalBuffer, 'equals').mockReturnValue(false);
			calculateRatio.mockReturnValue(25); // 25% compression

			const filePaths = [
				{ input: '/input/test.svg', output: '/output/test.svg' },
			];

			await optimize({ filePaths, config: {} });

			// Should process file due to changes in SVG
			expect(fs.promises.writeFile).toHaveBeenCalledWith(
				'/output/test.svg',
				expect.any(Buffer),
			);
		});

		test('should handle non-SVG files with size increase correctly', async () => {
			const originalBuffer = Buffer.from('original-data');
			const processedBuffer = Buffer.from('processed-data-larger');

			fs.promises.readFile.mockResolvedValue(originalBuffer);
			parseImageMetadata.mockResolvedValue({ format: 'jpeg' });

			// Mock path.extname to return non-svg
			path.extname.mockReturnValue('.jpg');

			// Mock Sharp processing
			sharp().toBuffer.mockResolvedValue(processedBuffer);

			// Mock buffer equals to return false (changed but larger)
			vi.spyOn(originalBuffer, 'equals').mockReturnValue(false);
			calculateRatio.mockReturnValue(-10); // Size increased

			const filePaths = [
				{ input: '/input/test.jpg', output: '/output/test.jpg' },
			];

			await optimize({ filePaths, config: {} });

			// Should skip file due to size increase
			expect(logProgressVerbose).toHaveBeenCalledWith(
				expect.any(String),
				expect.objectContaining({
					description: 'File size increased. Skipped',
				}),
			);
			expect(fs.promises.writeFile).not.toHaveBeenCalled();
		});

		test('should handle concurrent processing limits correctly', async () => {
			const filePaths = Array.from({ length: 20 }, (_, index) => ({
				input: `/input/file${index}.jpg`,
				output: `/output/file${index}.jpg`,
			}));

			// Mock successful processing for all files
			fs.promises.readFile.mockResolvedValue(Buffer.from('test-data'));
			parseImageMetadata.mockResolvedValue({ format: 'jpeg' });
			sharp().toBuffer.mockResolvedValue(Buffer.from('processed-data'));
			calculateRatio.mockReturnValue(25);

			// Track pLimit calls to ensure concurrency control
			const limitCalls = [];
			pLimit.mockImplementation(limit => {
				limitCalls.push(limit);
				return function (function_) {
					return Promise.resolve(function_());
				};
			});

			await optimize({ filePaths, config: {} });

			// Should use CPU-based concurrency limit
			expect(limitCalls[0]).toBe(4); // Based on mocked CPU count
		});

		test('should handle memory-intensive operations efficiently', async () => {
			// Create large buffer to test memory handling
			const largeBuffer = Buffer.alloc(10 * 1024 * 1024); // 10MB

			fs.promises.readFile.mockResolvedValue(largeBuffer);
			parseImageMetadata.mockResolvedValue({ format: 'jpeg' });
			sharp().toBuffer.mockResolvedValue(Buffer.from('processed-large-data'));
			calculateRatio.mockReturnValue(50);

			const filePaths = [
				{ input: '/input/large-file.jpg', output: '/output/large-file.jpg' },
			];

			await optimize({ filePaths, config: {} });

			expect(fs.promises.writeFile).toHaveBeenCalledWith(
				'/output/large-file.jpg',
				expect.any(Buffer),
			);
		});

		test('should handle mixed file types in batch processing', async () => {
			const filePaths = [
				{ input: '/input/image.jpg', output: '/output/image.jpg' },
				{ input: '/input/graphic.png', output: '/output/graphic.png' },
				{ input: '/input/animation.gif', output: '/output/animation.gif' },
				{ input: '/input/vector.svg', output: '/output/vector.svg' },
			];

			// Setup different responses for different file types
			fs.promises.readFile.mockImplementation(filePath => {
				if (filePath.includes('jpg')) {
					return Promise.resolve(Buffer.from('jpeg-data'));
				}

				if (filePath.includes('png')) {
					return Promise.resolve(Buffer.from('png-data'));
				}

				if (filePath.includes('gif')) {
					return Promise.resolve(Buffer.from('gif-data'));
				}

				if (filePath.includes('svg')) {
					return Promise.resolve(Buffer.from('svg-data'));
				}

				return Promise.resolve(Buffer.from('default-data'));
			});

			parseImageMetadata.mockImplementation(buffer => {
				const data = buffer.toString();
				if (data.includes('jpeg')) {
					return Promise.resolve({ format: 'jpeg' });
				}

				if (data.includes('png')) {
					return Promise.resolve({ format: 'png' });
				}

				if (data.includes('gif')) {
					return Promise.resolve({ format: 'gif' });
				}

				if (data.includes('svg')) {
					return Promise.resolve({ format: 'svg' });
				}

				return Promise.resolve({ format: 'unknown' });
			});

			calculateRatio.mockReturnValue(30);

			await optimize({ filePaths, config: {} });

			// Should process all file types
			expect(fs.promises.writeFile).toHaveBeenCalledTimes(4);
		});
	});
});
