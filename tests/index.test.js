import {
	beforeEach, describe, expect, test, vi,
} from 'vitest';

import optimizt from '../index.js';

// Mock Node.js built-in modules
vi.mock('node:url', () => ({
	pathToFileURL: vi.fn(),
}));

// Mock convert and optimize modules
vi.mock('../convert.js', () => ({
	convert: vi.fn(),
}));

vi.mock('../optimize.js', () => ({
	optimize: vi.fn(),
}));

// Mock utility functions from lib directory
vi.mock('../lib/constants.js', () => ({
	SUPPORTED_FILE_TYPES: {
		CONVERT: ['gif', 'jpeg', 'jpg', 'png'],
		OPTIMIZE: ['gif', 'jpeg', 'jpg', 'png', 'svg'],
	},
}));

vi.mock('../lib/find-config-file-path.js', () => ({
	findConfigFilePath: vi.fn(),
}));

vi.mock('../lib/log.js', () => ({
	log: vi.fn(),
}));

vi.mock('../lib/prepare-file-paths.js', () => ({
	prepareFilePaths: vi.fn(),
}));

vi.mock('../lib/prepare-output-directory-path.js', () => ({
	prepareOutputDirectoryPath: vi.fn(),
}));

vi.mock('../lib/program-options.js', () => ({
	programOptions: {
		isLossless: false,
		shouldConvertToAvif: false,
		shouldConvertToWebp: false,
	},
}));

describe('index', () => {
	// Import mocked modules for test setup
	let pathToFileURL;
	let convert;
	let optimize;
	let SUPPORTED_FILE_TYPES;
	let findConfigFilePath;
	let log;
	let prepareFilePaths;
	let prepareOutputDirectoryPath;
	let programOptions;

	beforeEach(async () => {
		// Clear all mocks before each test
		vi.clearAllMocks();

		// Import mocked modules
		({ pathToFileURL } = await import('node:url'));
		({ convert } = await import('../convert.js'));
		({ optimize } = await import('../optimize.js'));
		({ SUPPORTED_FILE_TYPES } = await import('../lib/constants.js'));
		({ findConfigFilePath } = await import('../lib/find-config-file-path.js'));
		({ log } = await import('../lib/log.js'));
		({ prepareFilePaths } = await import('../lib/prepare-file-paths.js'));
		({ prepareOutputDirectoryPath } = await import('../lib/prepare-output-directory-path.js'));
		({ programOptions } = await import('../lib/program-options.js'));

		// Set up common mock configurations
		setupCommonMocks();
	});

	function setupCommonMocks() {
		// Configuration file discovery mocks
		findConfigFilePath.mockResolvedValue('/path/to/.optimiztrc.cjs');
		pathToFileURL.mockReturnValue('file:///path/to/.optimiztrc.cjs');

		// File path preparation mocks
		prepareOutputDirectoryPath.mockResolvedValue('/output/directory');
		prepareFilePaths.mockResolvedValue([
			{ input: '/input/file1.jpg', output: '/output/file1.jpg' },
			{ input: '/input/file2.png', output: '/output/file2.png' },
		]);

		// Mock dynamic import for config loading
		vi.doMock('file:///path/to/.optimiztrc.cjs', () => ({
			default: {
				convert: {
					avif: { lossy: { quality: 80 } },
					webp: { lossy: { quality: 85 } },
				},
				optimize: {
					jpeg: { lossy: { quality: 90 } },
					png: { lossy: { quality: 95 } },
				},
			},
		}));

		// Reset program options to default state
		programOptions.isLossless = false;
		programOptions.shouldConvertToAvif = false;
		programOptions.shouldConvertToWebp = false;

		// Mock process functions
		convert.mockResolvedValue();
		optimize.mockResolvedValue();
	}

	describe('mode selection', () => {
		test('should select convert mode when shouldConvertToAvif is true', async () => {
			programOptions.shouldConvertToAvif = true;
			programOptions.shouldConvertToWebp = false;

			await optimizt({
				inputPaths: ['/input/path'],
				outputDirectoryPath: '/output/path',
				configFilePath: undefined,
			});

			expect(convert).toHaveBeenCalledWith({
				filePaths: expect.any(Array),
				config: expect.objectContaining({
					avif: { lossy: { quality: 80 } },
					webp: { lossy: { quality: 85 } },
				}),
			});
			expect(optimize).not.toHaveBeenCalled();
		});

		test('should select convert mode when shouldConvertToWebp is true', async () => {
			programOptions.shouldConvertToAvif = false;
			programOptions.shouldConvertToWebp = true;

			await optimizt({
				inputPaths: ['/input/path'],
				outputDirectoryPath: '/output/path',
				configFilePath: undefined,
			});

			expect(convert).toHaveBeenCalledWith({
				filePaths: expect.any(Array),
				config: expect.objectContaining({
					avif: { lossy: { quality: 80 } },
					webp: { lossy: { quality: 85 } },
				}),
			});
			expect(optimize).not.toHaveBeenCalled();
		});

		test('should select convert mode when both shouldConvertToAvif and shouldConvertToWebp are true', async () => {
			programOptions.shouldConvertToAvif = true;
			programOptions.shouldConvertToWebp = true;

			await optimizt({
				inputPaths: ['/input/path'],
				outputDirectoryPath: '/output/path',
				configFilePath: undefined,
			});

			expect(convert).toHaveBeenCalledWith({
				filePaths: expect.any(Array),
				config: expect.objectContaining({
					avif: { lossy: { quality: 80 } },
					webp: { lossy: { quality: 85 } },
				}),
			});
			expect(optimize).not.toHaveBeenCalled();
		});

		test('should select optimize mode when no conversion flags are set', async () => {
			programOptions.shouldConvertToAvif = false;
			programOptions.shouldConvertToWebp = false;

			await optimizt({
				inputPaths: ['/input/path'],
				outputDirectoryPath: '/output/path',
				configFilePath: undefined,
			});

			expect(optimize).toHaveBeenCalledWith({
				filePaths: expect.any(Array),
				config: expect.objectContaining({
					jpeg: { lossy: { quality: 90 } },
					png: { lossy: { quality: 95 } },
				}),
			});
			expect(convert).not.toHaveBeenCalled();
		});
	});

	describe('configuration file discovery and loading', () => {
		test('should find config file path using findConfigFilePath', async () => {
			const customConfigPath = '/custom/config/.optimiztrc.cjs';

			await optimizt({
				inputPaths: ['/input/path'],
				outputDirectoryPath: '/output/path',
				configFilePath: customConfigPath,
			});

			expect(findConfigFilePath).toHaveBeenCalledWith(customConfigPath);
		});

		test('should convert config file path to URL using pathToFileURL', async () => {
			const configPath = '/found/config/.optimiztrc.cjs';
			findConfigFilePath.mockResolvedValue(configPath);

			await optimizt({
				inputPaths: ['/input/path'],
				outputDirectoryPath: '/output/path',
				configFilePath: undefined,
			});

			expect(pathToFileURL).toHaveBeenCalledWith(configPath);
		});

		test('should dynamically import config file using pathToFileURL result', async () => {
			const configPath = '/test/config/.optimiztrc.cjs';
			const configURL = 'file:///test/config/.optimiztrc.cjs';

			findConfigFilePath.mockResolvedValue(configPath);
			pathToFileURL.mockReturnValue(configURL);

			// Mock the dynamic import for this specific URL
			vi.doMock(configURL, () => ({
				default: {
					convert: { avif: { test: true } },
					optimize: { jpeg: { test: true } },
				},
			}));

			await optimizt({
				inputPaths: ['/input/path'],
				outputDirectoryPath: '/output/path',
				configFilePath: undefined,
			});

			expect(pathToFileURL).toHaveBeenCalledWith(configPath);
		});

		test('should handle config file with missing sections gracefully', async () => {
			const configURL = 'file:///minimal/config/.optimiztrc.cjs';
			pathToFileURL.mockReturnValue(configURL);

			// Mock config with missing convert section
			vi.doMock(configURL, () => ({
				default: {
					optimize: { jpeg: { quality: 80 } },
				},
			}));

			programOptions.shouldConvertToAvif = true;

			await optimizt({
				inputPaths: ['/input/path'],
				outputDirectoryPath: '/output/path',
				configFilePath: undefined,
			});

			expect(convert).toHaveBeenCalledWith({
				filePaths: expect.any(Array),
				config: undefined, // Should be undefined when section is missing
			});
		});
	});

	describe('mode-specific config section selection', () => {
		test('should use convert config section when in convert mode', async () => {
			programOptions.shouldConvertToAvif = true;

			const configURL = 'file:///convert/config/.optimiztrc.cjs';
			pathToFileURL.mockReturnValue(configURL);

			const mockConfig = {
				convert: {
					avif: { lossy: { quality: 75 } },
					webp: { lossy: { quality: 80 } },
				},
				optimize: {
					jpeg: { lossy: { quality: 90 } },
				},
			};

			vi.doMock(configURL, () => ({ default: mockConfig }));

			await optimizt({
				inputPaths: ['/input/path'],
				outputDirectoryPath: '/output/path',
				configFilePath: undefined,
			});

			expect(convert).toHaveBeenCalledWith({
				filePaths: expect.any(Array),
				config: mockConfig.convert,
			});
		});

		test('should use optimize config section when in optimize mode', async () => {
			programOptions.shouldConvertToAvif = false;
			programOptions.shouldConvertToWebp = false;

			const configURL = 'file:///optimize/config/.optimiztrc.cjs';
			pathToFileURL.mockReturnValue(configURL);

			const mockConfig = {
				convert: {
					avif: { lossy: { quality: 75 } },
				},
				optimize: {
					jpeg: { lossy: { quality: 85 } },
					png: { lossy: { quality: 90 } },
					svg: { multipass: true },
				},
			};

			vi.doMock(configURL, () => ({ default: mockConfig }));

			await optimizt({
				inputPaths: ['/input/path'],
				outputDirectoryPath: '/output/path',
				configFilePath: undefined,
			});

			expect(optimize).toHaveBeenCalledWith({
				filePaths: expect.any(Array),
				config: mockConfig.optimize,
			});
		});

		test('should handle config with case-sensitive section names', async () => {
			programOptions.shouldConvertToWebp = true;

			const configURL = 'file:///case/config/.optimiztrc.cjs';
			pathToFileURL.mockReturnValue(configURL);

			const mockConfig = {
				Convert: { avif: { quality: 70 } }, // Wrong case
				convert: { webp: { quality: 85 } }, // Correct case
				optimize: { jpeg: { quality: 90 } },
			};

			vi.doMock(configURL, () => ({ default: mockConfig }));

			await optimizt({
				inputPaths: ['/input/path'],
				outputDirectoryPath: '/output/path',
				configFilePath: undefined,
			});

			// Should use lowercase 'convert' section
			expect(convert).toHaveBeenCalledWith({
				filePaths: expect.any(Array),
				config: mockConfig.convert,
			});
		});
	});

	describe('file path preparation and integration', () => {
		test('should prepare file paths with convert extensions when in convert mode', async () => {
			programOptions.shouldConvertToAvif = true;

			await optimizt({
				inputPaths: ['/input/dir1', '/input/dir2'],
				outputDirectoryPath: '/custom/output',
				configFilePath: undefined,
			});

			expect(prepareFilePaths).toHaveBeenCalledWith({
				inputPaths: ['/input/dir1', '/input/dir2'],
				outputDirectoryPath: '/output/directory',
				extensions: SUPPORTED_FILE_TYPES.CONVERT,
			});
		});

		test('should prepare file paths with optimize extensions when in optimize mode', async () => {
			programOptions.shouldConvertToAvif = false;
			programOptions.shouldConvertToWebp = false;

			await optimizt({
				inputPaths: ['/input/images'],
				outputDirectoryPath: '/opt/output',
				configFilePath: undefined,
			});

			expect(prepareFilePaths).toHaveBeenCalledWith({
				inputPaths: ['/input/images'],
				outputDirectoryPath: '/output/directory',
				extensions: SUPPORTED_FILE_TYPES.OPTIMIZE,
			});
		});

		test('should use correct extensions for WebP-only conversion', async () => {
			programOptions.shouldConvertToAvif = false;
			programOptions.shouldConvertToWebp = true;

			await optimizt({
				inputPaths: ['/input/path'],
				outputDirectoryPath: '/output/path',
				configFilePath: undefined,
			});

			expect(prepareFilePaths).toHaveBeenCalledWith({
				inputPaths: ['/input/path'],
				outputDirectoryPath: '/output/directory',
				extensions: SUPPORTED_FILE_TYPES.CONVERT,
			});
		});

		test('should use correct extensions for AVIF-only conversion', async () => {
			programOptions.shouldConvertToAvif = true;
			programOptions.shouldConvertToWebp = false;

			await optimizt({
				inputPaths: ['/input/path'],
				outputDirectoryPath: '/output/path',
				configFilePath: undefined,
			});

			expect(prepareFilePaths).toHaveBeenCalledWith({
				inputPaths: ['/input/path'],
				outputDirectoryPath: '/output/directory',
				extensions: SUPPORTED_FILE_TYPES.CONVERT,
			});
		});

		test('should use correct extensions for dual AVIF and WebP conversion', async () => {
			programOptions.shouldConvertToAvif = true;
			programOptions.shouldConvertToWebp = true;

			await optimizt({
				inputPaths: ['/input/path'],
				outputDirectoryPath: '/output/path',
				configFilePath: undefined,
			});

			expect(prepareFilePaths).toHaveBeenCalledWith({
				inputPaths: ['/input/path'],
				outputDirectoryPath: '/output/directory',
				extensions: SUPPORTED_FILE_TYPES.CONVERT,
			});
		});

		test('should prepare output directory path correctly', async () => {
			const customOutputPath = '/custom/output/directory';

			await optimizt({
				inputPaths: ['/input/path'],
				outputDirectoryPath: customOutputPath,
				configFilePath: undefined,
			});

			expect(prepareOutputDirectoryPath).toHaveBeenCalledWith(customOutputPath);
		});

		test('should use prepared output directory path in prepareFilePaths', async () => {
			const preparedOutputPath = '/prepared/output/path';
			prepareOutputDirectoryPath.mockResolvedValue(preparedOutputPath);

			await optimizt({
				inputPaths: ['/input/path'],
				outputDirectoryPath: '/original/output',
				configFilePath: undefined,
			});

			expect(prepareFilePaths).toHaveBeenCalledWith({
				inputPaths: ['/input/path'],
				outputDirectoryPath: preparedOutputPath,
				extensions: expect.any(Array),
			});
		});

		test('should validate output directory path preparation with nested paths', async () => {
			const nestedOutputPath = '/very/deep/nested/output/directory';
			const preparedNestedPath = '/prepared/very/deep/nested/output/directory';
			prepareOutputDirectoryPath.mockResolvedValue(preparedNestedPath);

			await optimizt({
				inputPaths: ['/input/path'],
				outputDirectoryPath: nestedOutputPath,
				configFilePath: undefined,
			});

			expect(prepareOutputDirectoryPath).toHaveBeenCalledWith(nestedOutputPath);
			expect(prepareFilePaths).toHaveBeenCalledWith({
				inputPaths: ['/input/path'],
				outputDirectoryPath: preparedNestedPath,
				extensions: expect.any(Array),
			});
		});

		test('should handle relative output directory paths', async () => {
			const relativeOutputPath = './relative/output';
			const preparedRelativePath = '/absolute/relative/output';
			prepareOutputDirectoryPath.mockResolvedValue(preparedRelativePath);

			await optimizt({
				inputPaths: ['/input/path'],
				outputDirectoryPath: relativeOutputPath,
				configFilePath: undefined,
			});

			expect(prepareOutputDirectoryPath).toHaveBeenCalledWith(relativeOutputPath);
			expect(prepareFilePaths).toHaveBeenCalledWith({
				inputPaths: ['/input/path'],
				outputDirectoryPath: preparedRelativePath,
				extensions: expect.any(Array),
			});
		});

		test('should maintain correct extension arrays for different modes', async () => {
			// Test convert mode extensions
			programOptions.shouldConvertToAvif = true;
			programOptions.shouldConvertToWebp = false;

			await optimizt({
				inputPaths: ['/input/path'],
				outputDirectoryPath: '/output/path',
				configFilePath: undefined,
			});

			expect(prepareFilePaths).toHaveBeenCalledWith({
				inputPaths: ['/input/path'],
				outputDirectoryPath: expect.any(String),
				extensions: SUPPORTED_FILE_TYPES.CONVERT,
			});

			// Reset mocks and test optimize mode extensions
			vi.clearAllMocks();
			setupCommonMocks();
			programOptions.shouldConvertToAvif = false;
			programOptions.shouldConvertToWebp = false;

			await optimizt({
				inputPaths: ['/input/path'],
				outputDirectoryPath: '/output/path',
				configFilePath: undefined,
			});

			expect(prepareFilePaths).toHaveBeenCalledWith({
				inputPaths: ['/input/path'],
				outputDirectoryPath: expect.any(String),
				extensions: SUPPORTED_FILE_TYPES.OPTIMIZE,
			});
		});
	});

	describe('lossless mode warning', () => {
		test('should display lossless warning when isLossless is true', async () => {
			programOptions.isLossless = true;

			await optimizt({
				inputPaths: ['/input/path'],
				outputDirectoryPath: '/output/path',
				configFilePath: undefined,
			});

			expect(log).toHaveBeenCalledWith('Lossless optimization may take a long time');
		});

		test('should not display lossless warning when isLossless is false', async () => {
			programOptions.isLossless = false;

			await optimizt({
				inputPaths: ['/input/path'],
				outputDirectoryPath: '/output/path',
				configFilePath: undefined,
			});

			expect(log).not.toHaveBeenCalledWith('Lossless optimization may take a long time');
		});

		test('should display lossless warning in convert mode', async () => {
			programOptions.isLossless = true;
			programOptions.shouldConvertToAvif = true;

			await optimizt({
				inputPaths: ['/input/path'],
				outputDirectoryPath: '/output/path',
				configFilePath: undefined,
			});

			expect(log).toHaveBeenCalledWith('Lossless optimization may take a long time');
		});

		test('should display lossless warning in optimize mode', async () => {
			programOptions.isLossless = true;
			programOptions.shouldConvertToAvif = false;
			programOptions.shouldConvertToWebp = false;

			await optimizt({
				inputPaths: ['/input/path'],
				outputDirectoryPath: '/output/path',
				configFilePath: undefined,
			});

			expect(log).toHaveBeenCalledWith('Lossless optimization may take a long time');
		});
	});

	describe('function delegation and integration', () => {
		test('should pass prepared file paths to convert function', async () => {
			programOptions.shouldConvertToAvif = true;

			const mockFilePaths = [
				{ input: '/input/test1.jpg', output: '/output/test1.jpg' },
				{ input: '/input/test2.png', output: '/output/test2.png' },
			];
			prepareFilePaths.mockResolvedValue(mockFilePaths);

			await optimizt({
				inputPaths: ['/input/path'],
				outputDirectoryPath: '/output/path',
				configFilePath: undefined,
			});

			expect(convert).toHaveBeenCalledWith({
				filePaths: mockFilePaths,
				config: expect.any(Object),
			});
		});

		test('should pass prepared file paths to optimize function', async () => {
			programOptions.shouldConvertToAvif = false;
			programOptions.shouldConvertToWebp = false;

			const mockFilePaths = [
				{ input: '/input/image1.svg', output: '/output/image1.svg' },
				{ input: '/input/image2.gif', output: '/output/image2.gif' },
			];
			prepareFilePaths.mockResolvedValue(mockFilePaths);

			await optimizt({
				inputPaths: ['/input/path'],
				outputDirectoryPath: '/output/path',
				configFilePath: undefined,
			});

			expect(optimize).toHaveBeenCalledWith({
				filePaths: mockFilePaths,
				config: expect.any(Object),
			});
		});

		test('should delegate to convert function when any conversion flag is set', async () => {
			// Test AVIF only
			programOptions.shouldConvertToAvif = true;
			programOptions.shouldConvertToWebp = false;

			await optimizt({
				inputPaths: ['/input/path'],
				outputDirectoryPath: '/output/path',
				configFilePath: undefined,
			});

			expect(convert).toHaveBeenCalledTimes(1);
			expect(optimize).not.toHaveBeenCalled();

			// Reset and test WebP only
			vi.clearAllMocks();
			setupCommonMocks();
			programOptions.shouldConvertToAvif = false;
			programOptions.shouldConvertToWebp = true;

			await optimizt({
				inputPaths: ['/input/path'],
				outputDirectoryPath: '/output/path',
				configFilePath: undefined,
			});

			expect(convert).toHaveBeenCalledTimes(1);
			expect(optimize).not.toHaveBeenCalled();
		});

		test('should delegate to optimize function when no conversion flags are set', async () => {
			programOptions.shouldConvertToAvif = false;
			programOptions.shouldConvertToWebp = false;

			await optimizt({
				inputPaths: ['/input/path'],
				outputDirectoryPath: '/output/path',
				configFilePath: undefined,
			});

			expect(optimize).toHaveBeenCalledTimes(1);
			expect(convert).not.toHaveBeenCalled();
		});

		test('should handle empty file paths array', async () => {
			prepareFilePaths.mockResolvedValue([]);

			await optimizt({
				inputPaths: ['/empty/path'],
				outputDirectoryPath: '/output/path',
				configFilePath: undefined,
			});

			expect(optimize).toHaveBeenCalledWith({
				filePaths: [],
				config: expect.any(Object),
			});
		});

		test('should maintain proper execution order', async () => {
			const executionOrder = [];

			// Mock functions to track execution order
			findConfigFilePath.mockImplementation(async () => {
				executionOrder.push('findConfigFilePath');
				return '/path/to/.optimiztrc.cjs';
			});

			prepareOutputDirectoryPath.mockImplementation(async () => {
				executionOrder.push('prepareOutputDirectoryPath');
				return '/output/directory';
			});

			prepareFilePaths.mockImplementation(async () => {
				executionOrder.push('prepareFilePaths');
				return [{ input: '/input/file.jpg', output: '/output/file.jpg' }];
			});

			optimize.mockImplementation(async () => {
				executionOrder.push('optimize');
			});

			await optimizt({
				inputPaths: ['/input/path'],
				outputDirectoryPath: '/output/path',
				configFilePath: undefined,
			});

			expect(executionOrder).toEqual([
				'findConfigFilePath',
				'prepareOutputDirectoryPath',
				'prepareFilePaths',
				'optimize',
			]);
		});

		test('should work with all parameters provided', async () => {
			const inputPaths = ['/input/dir1', '/input/dir2'];
			const outputDirectoryPath = '/custom/output';
			const configFilePath = '/custom/.optimiztrc.cjs';

			await optimizt({
				inputPaths,
				outputDirectoryPath,
				configFilePath,
			});

			expect(findConfigFilePath).toHaveBeenCalledWith(configFilePath);
			expect(prepareOutputDirectoryPath).toHaveBeenCalledWith(outputDirectoryPath);
			expect(prepareFilePaths).toHaveBeenCalledWith({
				inputPaths,
				outputDirectoryPath: expect.any(String),
				extensions: expect.any(Array),
			});
		});

		test('should work with minimal parameters', async () => {
			await optimizt({
				inputPaths: ['/input'],
				outputDirectoryPath: '/output',
				configFilePath: undefined,
			});

			expect(findConfigFilePath).toHaveBeenCalledWith(undefined);
			expect(prepareOutputDirectoryPath).toHaveBeenCalledWith('/output');
			expect(prepareFilePaths).toHaveBeenCalledWith({
				inputPaths: ['/input'],
				outputDirectoryPath: expect.any(String),
				extensions: expect.any(Array),
			});
		});

		test('should pass correct config to delegated functions', async () => {
			const configURL = 'file:///test/config/.optimiztrc.cjs';
			pathToFileURL.mockReturnValue(configURL);

			const mockConfig = {
				convert: {
					avif: { lossy: { quality: 75 } },
					webp: { lossy: { quality: 80 } },
				},
				optimize: {
					jpeg: { lossy: { quality: 85 } },
					png: { lossy: { quality: 90 } },
				},
			};

			vi.doMock(configURL, () => ({ default: mockConfig }));

			// Test convert mode
			programOptions.shouldConvertToAvif = true;

			await optimizt({
				inputPaths: ['/input/path'],
				outputDirectoryPath: '/output/path',
				configFilePath: undefined,
			});

			expect(convert).toHaveBeenCalledWith({
				filePaths: expect.any(Array),
				config: mockConfig.convert,
			});

			// Reset and test optimize mode
			vi.clearAllMocks();
			setupCommonMocks();
			pathToFileURL.mockReturnValue(configURL);
			vi.doMock(configURL, () => ({ default: mockConfig }));
			programOptions.shouldConvertToAvif = false;
			programOptions.shouldConvertToWebp = false;

			await optimizt({
				inputPaths: ['/input/path'],
				outputDirectoryPath: '/output/path',
				configFilePath: undefined,
			});

			expect(optimize).toHaveBeenCalledWith({
				filePaths: expect.any(Array),
				config: mockConfig.optimize,
			});
		});

		test('should handle complex file path arrays with mixed types', async () => {
			const complexFilePaths = [
				{ input: '/input/photo.jpg', output: '/output/photo.jpg' },
				{ input: '/input/logo.png', output: '/output/logo.png' },
				{ input: '/input/animation.gif', output: '/output/animation.gif' },
				{ input: '/input/icon.svg', output: '/output/icon.svg' },
			];
			prepareFilePaths.mockResolvedValue(complexFilePaths);

			await optimizt({
				inputPaths: ['/input/mixed'],
				outputDirectoryPath: '/output/mixed',
				configFilePath: undefined,
			});

			expect(optimize).toHaveBeenCalledWith({
				filePaths: complexFilePaths,
				config: expect.any(Object),
			});
		});
	});
});
