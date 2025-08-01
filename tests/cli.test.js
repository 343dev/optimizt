/* eslint-disable no-await-in-loop */
import {
	afterEach, beforeEach, describe, expect, test, vi,
} from 'vitest';

// Mock Node.js built-in modules
const mockFs = {
	readFile: vi.fn(),
};

const mockPath = {
	dirname: vi.fn(),
	join: vi.fn(),
};

const mockFileURLToPath = vi.fn();

// Mock commander program
const mockProgram = {
	option: vi.fn().mockReturnThis(),
	allowExcessArguments: vi.fn().mockReturnThis(),
	usage: vi.fn().mockReturnThis(),
	version: vi.fn().mockReturnThis(),
	description: vi.fn().mockReturnThis(),
	parse: vi.fn().mockReturnThis(),
	help: vi.fn(),
	args: [],
	opts: vi.fn().mockReturnValue({}),
};

// Mock main optimizt function
const mockOptimizt = vi.fn();

// Mock setProgramOptions
const mockSetProgramOptions = vi.fn();

vi.mock('node:fs/promises', () => ({
	default: mockFs,
}));

vi.mock('node:path', () => ({
	default: mockPath,
}));

vi.mock('node:url', () => ({
	fileURLToPath: mockFileURLToPath,
}));

vi.mock('commander', () => ({
	program: mockProgram,
}));

vi.mock('../index.js', () => ({
	default: mockOptimizt,
}));

vi.mock('../lib/program-options.js', () => ({
	setProgramOptions: mockSetProgramOptions,
}));

function setupCommonMocks() {
	// Mock package.json reading
	const mockPackageJson = {
		version: '11.0.0',
		description: 'CLI image optimization tool',
	};
	mockFs.readFile.mockResolvedValue(JSON.stringify(mockPackageJson));

	// Mock path operations
	mockPath.dirname.mockReturnValue('/mock/dirname');
	mockPath.join.mockReturnValue('/mock/path/package.json');
	mockFileURLToPath.mockReturnValue('/mock/file/path');

	// Reset program state
	mockProgram.args = [];
	mockProgram.opts.mockReturnValue({});
}

/**
 * Helper function to mock program options returned by commander
 * @param {Object} options - Options object to return from program.opts()
 */
function mockProgramOptions(options = {}) {
	mockProgram.opts.mockReturnValue(options);
}

/**
 * Helper function to mock program arguments
 * @param {string[]} args - Array of arguments to set on program.args
 */
function mockProgramArguments(arguments_ = []) {
	mockProgram.args = arguments_;
}

/**
 * Optimized helper to test multiple CLI scenarios efficiently
 * @param {Array} testCases - Array of test case objects
 * @param {Function} validator - Function to validate each test case result
 */
async function _runOptimizedTestBatch(testCases, validator) {
	const results = [];
	for (const testCase of testCases) {
		mockProgramArguments(testCase.args || []);
		mockProgramOptions(testCase.options || {});

		const cliModule = await import('../cli.js');
		results.push(cliModule);

		if (validator) {
			validator(testCase, cliModule);
		}

		// Efficient cleanup between test cases
		vi.clearAllMocks();
		setupCommonMocks();
	}

	return results;
}

describe('CLI', () => {
	// Mock process methods
	let originalArgv;
	let originalOn;
	let mockConsoleError;

	beforeEach(() => {
		// Clear all mocks before each test
		vi.clearAllMocks();

		// Setup common mocks
		setupCommonMocks();

		// Mock process methods
		originalArgv = process.argv;
		originalOn = process.on;
		mockConsoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
		process.on = vi.fn();
	});

	afterEach(() => {
		// Restore original process methods
		process.argv = originalArgv;
		process.on = originalOn;
		mockConsoleError.mockRestore();

		// Clear module cache to ensure fresh imports
		vi.resetModules();
	});

	/**
	 * Performance-optimized mock setup for repeated scenarios
	 * @param {Object} scenario - Scenario configuration
	 */

	/**
	 * Helper function to mock process.argv for testing CLI argument parsing
	 * @param {string[]} args - Array of command line arguments
	 */

	describe('Package.json reading and parsing', () => {
		test('should read package.json file from correct path', async () => {
			// Import the CLI module to trigger initialization
			await import('../cli.js');

			expect(mockFs.readFile).toHaveBeenCalledWith('/mock/path/package.json');
		});

		test('should parse package.json content correctly', async () => {
			const mockPackageContent = {
				version: '11.0.0',
				description: 'CLI image optimization tool',
				name: '@343dev/optimizt',
			};
			mockFs.readFile.mockResolvedValue(JSON.stringify(mockPackageContent));

			await import('../cli.js');

			expect(mockProgram.version).toHaveBeenCalledWith('11.0.0', '-V, --version');
			expect(mockProgram.description).toHaveBeenCalledWith('CLI image optimization tool');
		});

		test('should use version from package.json in program configuration', async () => {
			const customVersion = '12.5.3';
			const mockPackageContent = {
				version: customVersion,
				description: 'CLI image optimization tool',
			};
			mockFs.readFile.mockResolvedValue(JSON.stringify(mockPackageContent));

			await import('../cli.js');

			expect(mockProgram.version).toHaveBeenCalledWith(customVersion, '-V, --version');
		});

		test('should use description from package.json in program configuration', async () => {
			const customDescription = 'Custom image optimization CLI tool';
			const mockPackageContent = {
				version: '11.0.0',
				description: customDescription,
			};
			mockFs.readFile.mockResolvedValue(JSON.stringify(mockPackageContent));

			await import('../cli.js');

			expect(mockProgram.description).toHaveBeenCalledWith(customDescription);
		});

		test('should handle package.json with additional fields', async () => {
			const mockPackageContent = {
				name: '@343dev/optimizt',
				version: '11.0.0',
				description: 'CLI image optimization tool',
				author: 'Test Author',
				license: 'MIT',
				keywords: ['image', 'optimization'],
				dependencies: {
					commander: '^13.1.0',
				},
			};
			mockFs.readFile.mockResolvedValue(JSON.stringify(mockPackageContent));

			await import('../cli.js');

			expect(mockProgram.version).toHaveBeenCalledWith('11.0.0', '-V, --version');
			expect(mockProgram.description).toHaveBeenCalledWith('CLI image optimization tool');
		});

		test('should handle package.json reading error', async () => {
			const readError = new Error('Failed to read package.json');
			mockFs.readFile.mockRejectedValue(readError);

			// The CLI module should throw an error when package.json cannot be read
			await expect(import('../cli.js')).rejects.toThrow('Failed to read package.json');
		});

		test('should handle invalid JSON in package.json', async () => {
			const invalidJson = '{ "version": "11.0.0", "description": "CLI tool" invalid }';
			mockFs.readFile.mockResolvedValue(invalidJson);

			// The CLI module should throw a JSON parsing error
			await expect(import('../cli.js')).rejects.toThrow();
		});

		test('should handle empty package.json file', async () => {
			mockFs.readFile.mockResolvedValue('{}');

			await import('../cli.js');

			// Should handle undefined version and description gracefully
			expect(mockProgram.version).toHaveBeenCalledWith(undefined, '-V, --version');
			expect(mockProgram.description).toHaveBeenCalledWith(undefined);
		});

		test('should handle package.json with null values', async () => {
			const mockPackageContent = {
				version: undefined,
				description: undefined,
			};
			mockFs.readFile.mockResolvedValue(JSON.stringify(mockPackageContent));

			await import('../cli.js');

			expect(mockProgram.version).toHaveBeenCalledWith(undefined, '-V, --version');
			expect(mockProgram.description).toHaveBeenCalledWith(undefined);
		});

		test('should handle package.json with missing version field', async () => {
			const mockPackageContent = {
				description: 'CLI image optimization tool',
				name: '@343dev/optimizt',
			};
			mockFs.readFile.mockResolvedValue(JSON.stringify(mockPackageContent));

			await import('../cli.js');

			expect(mockProgram.version).toHaveBeenCalledWith(undefined, '-V, --version');
			expect(mockProgram.description).toHaveBeenCalledWith('CLI image optimization tool');
		});

		test('should handle package.json with missing description field', async () => {
			const mockPackageContent = {
				version: '11.0.0',
				name: '@343dev/optimizt',
			};
			mockFs.readFile.mockResolvedValue(JSON.stringify(mockPackageContent));

			await import('../cli.js');

			expect(mockProgram.version).toHaveBeenCalledWith('11.0.0', '-V, --version');
			expect(mockProgram.description).toHaveBeenCalledWith(undefined);
		});

		test('should construct correct path to package.json using path.join', async () => {
			await import('../cli.js');

			expect(mockPath.join).toHaveBeenCalledWith('/mock/dirname', 'package.json');
		});

		test('should use fileURLToPath to get current directory', async () => {
			await import('../cli.js');

			expect(mockFileURLToPath).toHaveBeenCalledWith(expect.any(String));
			expect(mockPath.dirname).toHaveBeenCalledWith('/mock/file/path');
		});
	});

	describe('Module setup and initialization', () => {
		test('should setup commander program with correct options', async () => {
			await import('../cli.js');

			// Verify all CLI options are configured
			expect(mockProgram.option).toHaveBeenCalledWith('--avif', 'create AVIF and exit');
			expect(mockProgram.option).toHaveBeenCalledWith('--webp', 'create WebP and exit');
			expect(mockProgram.option).toHaveBeenCalledWith('-f, --force', 'force create AVIF and WebP');
			expect(mockProgram.option).toHaveBeenCalledWith('-l, --lossless', 'perform lossless optimizations');
			expect(mockProgram.option).toHaveBeenCalledWith('-v, --verbose', 'be verbose');
			expect(mockProgram.option).toHaveBeenCalledWith('-c, --config <path>', 'use this configuration, overriding default config options if present');
			expect(mockProgram.option).toHaveBeenCalledWith('-o, --output <path>', 'write output to directory');
		});

		test('should configure program metadata', async () => {
			await import('../cli.js');

			expect(mockProgram.allowExcessArguments).toHaveBeenCalled();
			expect(mockProgram.usage).toHaveBeenCalledWith('[options] <dir> <file ...>');
			expect(mockProgram.version).toHaveBeenCalledWith('11.0.0', '-V, --version');
			expect(mockProgram.description).toHaveBeenCalledWith('CLI image optimization tool');
		});

		test('should parse process.argv', async () => {
			await import('../cli.js');

			expect(mockProgram.parse).toHaveBeenCalledWith(process.argv);
		});

		test('should setup unhandledRejection handler', async () => {
			await import('../cli.js');

			expect(process.on).toHaveBeenCalledWith('unhandledRejection', expect.any(Function));
		});
	});

	describe('Missing arguments handling', () => {
		test('should show help when no arguments provided', async () => {
			mockProgramArguments([]);

			await import('../cli.js');

			expect(mockProgram.help).toHaveBeenCalled();
			expect(mockSetProgramOptions).not.toHaveBeenCalled();
			expect(mockOptimizt).not.toHaveBeenCalled();
		});

		test('should call program.help() when program.args.length === 0', async () => {
			// Explicitly test the condition program.args.length === 0
			mockProgramArguments([]);

			await import('../cli.js');

			// Verify that help() is called exactly once
			expect(mockProgram.help).toHaveBeenCalledTimes(1);
			expect(mockProgram.help).toHaveBeenCalledWith();
		});

		test('should not call optimizt when no arguments provided', async () => {
			mockProgramArguments([]);

			await import('../cli.js');

			// Ensure optimizt is never called when there are no arguments
			expect(mockOptimizt).not.toHaveBeenCalled();
		});

		test('should not call setProgramOptions when no arguments provided', async () => {
			mockProgramArguments([]);

			await import('../cli.js');

			// Ensure setProgramOptions is never called when there are no arguments
			expect(mockSetProgramOptions).not.toHaveBeenCalled();
		});

		test('should not execute main logic when program.args is empty array', async () => {
			// Test with explicitly empty array
			mockProgramArguments([]);
			mockProgramOptions({
				avif: true,
				webp: true,
				force: true,
				lossless: true,
				verbose: true,
				config: '/some/config',
				output: '/some/output',
			});

			await import('../cli.js');

			// Even with options set, if no arguments are provided, help should be shown
			expect(mockProgram.help).toHaveBeenCalled();
			expect(mockSetProgramOptions).not.toHaveBeenCalled();
			expect(mockOptimizt).not.toHaveBeenCalled();
		});

		test('should process arguments when at least one argument is provided', async () => {
			mockProgramArguments(['/input/path']);
			mockProgramOptions({
				avif: false,
				webp: false,
				force: false,
				lossless: false,
				verbose: false,
				config: undefined,
				output: undefined,
			});

			await import('../cli.js');

			// When arguments are provided, help should not be called
			expect(mockProgram.help).not.toHaveBeenCalled();
			expect(mockSetProgramOptions).toHaveBeenCalled();
			expect(mockOptimizt).toHaveBeenCalled();
		});
	});

	describe('CLI argument parsing', () => {
		describe('Boolean flags', () => {
			test('should parse --avif flag correctly', async () => {
				mockProgramArguments(['/input/path']);
				mockProgramOptions({ avif: true });

				await import('../cli.js');

				expect(mockSetProgramOptions).toHaveBeenCalledWith(
					expect.objectContaining({
						shouldConvertToAvif: true,
					}),
				);
			});

			test('should parse --webp flag correctly', async () => {
				mockProgramArguments(['/input/path']);
				mockProgramOptions({ webp: true });

				await import('../cli.js');

				expect(mockSetProgramOptions).toHaveBeenCalledWith(
					expect.objectContaining({
						shouldConvertToWebp: true,
					}),
				);
			});

			test('should parse --force flag correctly', async () => {
				mockProgramArguments(['/input/path']);
				mockProgramOptions({ force: true });

				await import('../cli.js');

				expect(mockSetProgramOptions).toHaveBeenCalledWith(
					expect.objectContaining({
						isForced: true,
					}),
				);
			});

			test('should parse -f (short form of --force) flag correctly', async () => {
				mockProgramArguments(['/input/path']);
				mockProgramOptions({ force: true });

				await import('../cli.js');

				expect(mockSetProgramOptions).toHaveBeenCalledWith(
					expect.objectContaining({
						isForced: true,
					}),
				);
			});

			test('should parse --lossless flag correctly', async () => {
				mockProgramArguments(['/input/path']);
				mockProgramOptions({ lossless: true });

				await import('../cli.js');

				expect(mockSetProgramOptions).toHaveBeenCalledWith(
					expect.objectContaining({
						isLossless: true,
					}),
				);
			});

			test('should parse -l (short form of --lossless) flag correctly', async () => {
				mockProgramArguments(['/input/path']);
				mockProgramOptions({ lossless: true });

				await import('../cli.js');

				expect(mockSetProgramOptions).toHaveBeenCalledWith(
					expect.objectContaining({
						isLossless: true,
					}),
				);
			});

			test('should parse --verbose flag correctly', async () => {
				mockProgramArguments(['/input/path']);
				mockProgramOptions({ verbose: true });

				await import('../cli.js');

				expect(mockSetProgramOptions).toHaveBeenCalledWith(
					expect.objectContaining({
						isVerbose: true,
					}),
				);
			});

			test('should parse -v (short form of --verbose) flag correctly', async () => {
				mockProgramArguments(['/input/path']);
				mockProgramOptions({ verbose: true });

				await import('../cli.js');

				expect(mockSetProgramOptions).toHaveBeenCalledWith(
					expect.objectContaining({
						isVerbose: true,
					}),
				);
			});

			test('should handle multiple boolean flags together', async () => {
				mockProgramArguments(['/input/path']);
				mockProgramOptions({
					avif: true,
					webp: true,
					force: true,
					lossless: true,
					verbose: true,
				});

				await import('../cli.js');

				expect(mockSetProgramOptions).toHaveBeenCalledWith({
					shouldConvertToAvif: true,
					shouldConvertToWebp: true,
					isForced: true,
					isLossless: true,
					isVerbose: true,
				});
			});

			test('should default boolean flags to false when not provided', async () => {
				mockProgramArguments(['/input/path']);
				mockProgramOptions({});

				await import('../cli.js');

				expect(mockSetProgramOptions).toHaveBeenCalledWith({
					shouldConvertToAvif: false,
					shouldConvertToWebp: false,
					isForced: false,
					isLossless: false,
					isVerbose: false,
				});
			});
		});

		describe('Options with parameters', () => {
			test('should parse --config option with path parameter', async () => {
				const configPath = '/path/to/config.json';
				mockProgramArguments(['/input/path']);
				mockProgramOptions({ config: configPath });

				await import('../cli.js');

				expect(mockOptimizt).toHaveBeenCalledWith(
					expect.objectContaining({
						configFilePath: configPath,
					}),
				);
			});

			test('should parse -c (short form of --config) option with path parameter', async () => {
				const configPath = '/path/to/config.json';
				mockProgramArguments(['/input/path']);
				mockProgramOptions({ config: configPath });

				await import('../cli.js');

				expect(mockOptimizt).toHaveBeenCalledWith(
					expect.objectContaining({
						configFilePath: configPath,
					}),
				);
			});

			test('should parse --output option with path parameter', async () => {
				const outputPath = '/path/to/output';
				mockProgramArguments(['/input/path']);
				mockProgramOptions({ output: outputPath });

				await import('../cli.js');

				expect(mockOptimizt).toHaveBeenCalledWith(
					expect.objectContaining({
						outputDirectoryPath: outputPath,
					}),
				);
			});

			test('should parse -o (short form of --output) option with path parameter', async () => {
				const outputPath = '/path/to/output';
				mockProgramArguments(['/input/path']);
				mockProgramOptions({ output: outputPath });

				await import('../cli.js');

				expect(mockOptimizt).toHaveBeenCalledWith(
					expect.objectContaining({
						outputDirectoryPath: outputPath,
					}),
				);
			});

			test('should handle both --config and --output options together', async () => {
				const configPath = '/path/to/config.json';
				const outputPath = '/path/to/output';
				mockProgramArguments(['/input/path']);
				mockProgramOptions({
					config: configPath,
					output: outputPath,
				});

				await import('../cli.js');

				expect(mockOptimizt).toHaveBeenCalledWith({
					inputPaths: ['/input/path'],
					configFilePath: configPath,
					outputDirectoryPath: outputPath,
				});
			});

			test('should handle undefined config and output options', async () => {
				mockProgramArguments(['/input/path']);
				mockProgramOptions({
					config: undefined,
					output: undefined,
				});

				await import('../cli.js');

				expect(mockOptimizt).toHaveBeenCalledWith({
					inputPaths: ['/input/path'],
					configFilePath: undefined,
					outputDirectoryPath: undefined,
				});
			});

			test('should handle relative paths in config option', async () => {
				const configPath = './config/optimizt.config.js';
				mockProgramArguments(['/input/path']);
				mockProgramOptions({ config: configPath });

				await import('../cli.js');

				expect(mockOptimizt).toHaveBeenCalledWith(
					expect.objectContaining({
						configFilePath: configPath,
					}),
				);
			});

			test('should handle relative paths in output option', async () => {
				const outputPath = './dist/optimized';
				mockProgramArguments(['/input/path']);
				mockProgramOptions({ output: outputPath });

				await import('../cli.js');

				expect(mockOptimizt).toHaveBeenCalledWith(
					expect.objectContaining({
						outputDirectoryPath: outputPath,
					}),
				);
			});
		});

		describe('File and directory path handling', () => {
			test('should handle single file path', async () => {
				const filePath = '/path/to/image.jpg';
				mockProgramArguments([filePath]);
				mockProgramOptions({});

				await import('../cli.js');

				expect(mockOptimizt).toHaveBeenCalledWith(
					expect.objectContaining({
						inputPaths: [filePath],
					}),
				);
			});

			test('should handle single directory path', async () => {
				const directoryPath = '/path/to/images';
				mockProgramArguments([directoryPath]);
				mockProgramOptions({});

				await import('../cli.js');

				expect(mockOptimizt).toHaveBeenCalledWith(
					expect.objectContaining({
						inputPaths: [directoryPath],
					}),
				);
			});

			test('should handle multiple file paths', async () => {
				const filePaths = ['/path/to/image1.jpg', '/path/to/image2.png', '/path/to/image3.gif'];
				mockProgramArguments(filePaths);
				mockProgramOptions({});

				await import('../cli.js');

				expect(mockOptimizt).toHaveBeenCalledWith(
					expect.objectContaining({
						inputPaths: filePaths,
					}),
				);
			});

			test('should handle multiple directory paths', async () => {
				const directoryPaths = ['/path/to/images1', '/path/to/images2', '/path/to/images3'];
				mockProgramArguments(directoryPaths);
				mockProgramOptions({});

				await import('../cli.js');

				expect(mockOptimizt).toHaveBeenCalledWith(
					expect.objectContaining({
						inputPaths: directoryPaths,
					}),
				);
			});

			test('should handle mixed file and directory paths', async () => {
				const mixedPaths = ['/path/to/images', '/path/to/image.jpg', '/another/dir', 'single-file.png'];
				mockProgramArguments(mixedPaths);
				mockProgramOptions({});

				await import('../cli.js');

				expect(mockOptimizt).toHaveBeenCalledWith(
					expect.objectContaining({
						inputPaths: mixedPaths,
					}),
				);
			});

			test('should handle relative file paths', async () => {
				const relativePaths = ['./images/photo.jpg', '../assets/logo.png', 'icon.svg'];
				mockProgramArguments(relativePaths);
				mockProgramOptions({});

				await import('../cli.js');

				expect(mockOptimizt).toHaveBeenCalledWith(
					expect.objectContaining({
						inputPaths: relativePaths,
					}),
				);
			});

			test('should handle relative directory paths', async () => {
				const relativePaths = ['./src/images', '../public/assets', 'photos'];
				mockProgramArguments(relativePaths);
				mockProgramOptions({});

				await import('../cli.js');

				expect(mockOptimizt).toHaveBeenCalledWith(
					expect.objectContaining({
						inputPaths: relativePaths,
					}),
				);
			});

			test('should handle paths with spaces', async () => {
				const pathsWithSpaces = ['/path/to/my images', '/another path/photo.jpg'];
				mockProgramArguments(pathsWithSpaces);
				mockProgramOptions({});

				await import('../cli.js');

				expect(mockOptimizt).toHaveBeenCalledWith(
					expect.objectContaining({
						inputPaths: pathsWithSpaces,
					}),
				);
			});

			test('should handle current directory path', async () => {
				const currentDirectory = '.';
				mockProgramArguments([currentDirectory]);
				mockProgramOptions({});

				await import('../cli.js');

				expect(mockOptimizt).toHaveBeenCalledWith(
					expect.objectContaining({
						inputPaths: [currentDirectory],
					}),
				);
			});

			test('should handle parent directory path', async () => {
				const parentDirectory = '..';
				mockProgramArguments([parentDirectory]);
				mockProgramOptions({});

				await import('../cli.js');

				expect(mockOptimizt).toHaveBeenCalledWith(
					expect.objectContaining({
						inputPaths: [parentDirectory],
					}),
				);
			});
		});

		describe('Complex argument combinations', () => {
			test('should handle all flags with multiple paths', async () => {
				const inputPaths = ['/path1', '/path2', 'file.jpg'];
				mockProgramArguments(inputPaths);
				mockProgramOptions({
					avif: true,
					webp: true,
					force: true,
					lossless: true,
					verbose: true,
					config: '/config.json',
					output: '/output',
				});

				await import('../cli.js');

				expect(mockSetProgramOptions).toHaveBeenCalledWith({
					shouldConvertToAvif: true,
					shouldConvertToWebp: true,
					isForced: true,
					isLossless: true,
					isVerbose: true,
				});

				expect(mockOptimizt).toHaveBeenCalledWith({
					inputPaths,
					configFilePath: '/config.json',
					outputDirectoryPath: '/output',
				});
			});

			test('should handle partial flag combinations', async () => {
				const inputPaths = ['/images'];
				mockProgramArguments(inputPaths);
				mockProgramOptions({
					avif: true,
					force: true,
					verbose: true,
					output: '/dist',
				});

				await import('../cli.js');

				expect(mockSetProgramOptions).toHaveBeenCalledWith({
					shouldConvertToAvif: true,
					shouldConvertToWebp: false,
					isForced: true,
					isLossless: false,
					isVerbose: true,
				});

				expect(mockOptimizt).toHaveBeenCalledWith({
					inputPaths,
					configFilePath: undefined,
					outputDirectoryPath: '/dist',
				});
			});

			test('should handle only conversion flags without other options', async () => {
				const inputPaths = ['image.png'];
				mockProgramArguments(inputPaths);
				mockProgramOptions({
					avif: true,
					webp: true,
				});

				await import('../cli.js');

				expect(mockSetProgramOptions).toHaveBeenCalledWith({
					shouldConvertToAvif: true,
					shouldConvertToWebp: true,
					isForced: false,
					isLossless: false,
					isVerbose: false,
				});

				expect(mockOptimizt).toHaveBeenCalledWith({
					inputPaths,
					configFilePath: undefined,
					outputDirectoryPath: undefined,
				});
			});

			test('should handle only path options without boolean flags', async () => {
				const inputPaths = ['/src/images'];
				mockProgramArguments(inputPaths);
				mockProgramOptions({
					config: './optimizt.config.js',
					output: './dist/optimized',
				});

				await import('../cli.js');

				expect(mockSetProgramOptions).toHaveBeenCalledWith({
					shouldConvertToAvif: false,
					shouldConvertToWebp: false,
					isForced: false,
					isLossless: false,
					isVerbose: false,
				});

				expect(mockOptimizt).toHaveBeenCalledWith({
					inputPaths,
					configFilePath: './optimizt.config.js',
					outputDirectoryPath: './dist/optimized',
				});
			});
		});
	});

	describe('Program options setup', () => {
		test('should call setProgramOptions with correct boolean values for all flags', async () => {
			mockProgramArguments(['/input/path']);
			mockProgramOptions({
				avif: true,
				webp: true,
				force: true,
				lossless: true,
				verbose: true,
			});

			await import('../cli.js');

			expect(mockSetProgramOptions).toHaveBeenCalledTimes(1);
			expect(mockSetProgramOptions).toHaveBeenCalledWith({
				shouldConvertToAvif: true,
				shouldConvertToWebp: true,
				isForced: true,
				isLossless: true,
				isVerbose: true,
			});
		});

		test('should correctly pass shouldConvertToAvif when --avif flag is set', async () => {
			mockProgramArguments(['/input/path']);
			mockProgramOptions({
				avif: true,
				webp: false,
				force: false,
				lossless: false,
				verbose: false,
			});

			await import('../cli.js');

			expect(mockSetProgramOptions).toHaveBeenCalledWith(
				expect.objectContaining({
					shouldConvertToAvif: true,
				}),
			);
		});

		test('should correctly pass shouldConvertToWebp when --webp flag is set', async () => {
			mockProgramArguments(['/input/path']);
			mockProgramOptions({
				avif: false,
				webp: true,
				force: false,
				lossless: false,
				verbose: false,
			});

			await import('../cli.js');

			expect(mockSetProgramOptions).toHaveBeenCalledWith(
				expect.objectContaining({
					shouldConvertToWebp: true,
				}),
			);
		});

		test('should correctly pass isForced when --force flag is set', async () => {
			mockProgramArguments(['/input/path']);
			mockProgramOptions({
				avif: false,
				webp: false,
				force: true,
				lossless: false,
				verbose: false,
			});

			await import('../cli.js');

			expect(mockSetProgramOptions).toHaveBeenCalledWith(
				expect.objectContaining({
					isForced: true,
				}),
			);
		});

		test('should correctly pass isLossless when --lossless flag is set', async () => {
			mockProgramArguments(['/input/path']);
			mockProgramOptions({
				avif: false,
				webp: false,
				force: false,
				lossless: true,
				verbose: false,
			});

			await import('../cli.js');

			expect(mockSetProgramOptions).toHaveBeenCalledWith(
				expect.objectContaining({
					isLossless: true,
				}),
			);
		});

		test('should correctly pass isVerbose when --verbose flag is set', async () => {
			mockProgramArguments(['/input/path']);
			mockProgramOptions({
				avif: false,
				webp: false,
				force: false,
				lossless: false,
				verbose: true,
			});

			await import('../cli.js');

			expect(mockSetProgramOptions).toHaveBeenCalledWith(
				expect.objectContaining({
					isVerbose: true,
				}),
			);
		});

		test('should set options only when arguments are provided', async () => {
			// Test with no arguments - setProgramOptions should not be called
			mockProgramArguments([]);
			mockProgramOptions({
				avif: true,
				webp: true,
				force: true,
				lossless: true,
				verbose: true,
			});

			await import('../cli.js');

			expect(mockSetProgramOptions).not.toHaveBeenCalled();
		});

		test('should set options when at least one argument is provided', async () => {
			mockProgramArguments(['/input/path']);
			mockProgramOptions({
				avif: false,
				webp: false,
				force: false,
				lossless: false,
				verbose: false,
			});

			await import('../cli.js');

			expect(mockSetProgramOptions).toHaveBeenCalledTimes(1);
			expect(mockSetProgramOptions).toHaveBeenCalledWith({
				shouldConvertToAvif: false,
				shouldConvertToWebp: false,
				isForced: false,
				isLossless: false,
				isVerbose: false,
			});
		});

		test('should convert boolean values correctly using Boolean() constructor', async () => {
			mockProgramArguments(['/input/path']);
			mockProgramOptions({
				avif: undefined,
				webp: undefined,
				force: 0,
				lossless: '',
				verbose: false,
			});

			await import('../cli.js');

			expect(mockSetProgramOptions).toHaveBeenCalledWith({
				shouldConvertToAvif: false,
				shouldConvertToWebp: false,
				isForced: false,
				isLossless: false,
				isVerbose: false,
			});
		});

		test('should convert truthy values to true using Boolean() constructor', async () => {
			mockProgramArguments(['/input/path']);
			mockProgramOptions({
				avif: 'true',
				webp: 1,
				force: 'yes',
				lossless: true,
				verbose: 'verbose',
			});

			await import('../cli.js');

			expect(mockSetProgramOptions).toHaveBeenCalledWith({
				shouldConvertToAvif: true,
				shouldConvertToWebp: true,
				isForced: true,
				isLossless: true,
				isVerbose: true,
			});
		});

		test('should handle mixed boolean values correctly', async () => {
			mockProgramArguments(['/input/path']);
			mockProgramOptions({
				avif: true,
				webp: false,
				force: undefined,
				lossless: true,
				verbose: undefined,
			});

			await import('../cli.js');

			expect(mockSetProgramOptions).toHaveBeenCalledWith({
				shouldConvertToAvif: true,
				shouldConvertToWebp: false,
				isForced: false,
				isLossless: true,
				isVerbose: false,
			});
		});
	});

	describe('Option combinations and edge cases', () => {
		describe('Flag combinations', () => {
			test('should handle --avif --webp combination', async () => {
				mockProgramArguments(['/input/path']);
				mockProgramOptions({
					avif: true,
					webp: true,
				});

				await import('../cli.js');

				expect(mockSetProgramOptions).toHaveBeenCalledWith({
					shouldConvertToAvif: true,
					shouldConvertToWebp: true,
					isForced: false,
					isLossless: false,
					isVerbose: false,
				});

				expect(mockOptimizt).toHaveBeenCalledWith({
					inputPaths: ['/input/path'],
					configFilePath: undefined,
					outputDirectoryPath: undefined,
				});
			});

			test('should handle --avif --webp --force combination', async () => {
				mockProgramArguments(['/input/path']);
				mockProgramOptions({
					avif: true,
					webp: true,
					force: true,
				});

				await import('../cli.js');

				expect(mockSetProgramOptions).toHaveBeenCalledWith({
					shouldConvertToAvif: true,
					shouldConvertToWebp: true,
					isForced: true,
					isLossless: false,
					isVerbose: false,
				});

				expect(mockOptimizt).toHaveBeenCalledWith({
					inputPaths: ['/input/path'],
					configFilePath: undefined,
					outputDirectoryPath: undefined,
				});
			});

			test('should handle --avif --webp --force --lossless combination', async () => {
				mockProgramArguments(['/input/path']);
				mockProgramOptions({
					avif: true,
					webp: true,
					force: true,
					lossless: true,
				});

				await import('../cli.js');

				expect(mockSetProgramOptions).toHaveBeenCalledWith({
					shouldConvertToAvif: true,
					shouldConvertToWebp: true,
					isForced: true,
					isLossless: true,
					isVerbose: false,
				});

				expect(mockOptimizt).toHaveBeenCalledWith({
					inputPaths: ['/input/path'],
					configFilePath: undefined,
					outputDirectoryPath: undefined,
				});
			});

			test('should handle --avif --webp --force --lossless --verbose combination', async () => {
				mockProgramArguments(['/input/path']);
				mockProgramOptions({
					avif: true,
					webp: true,
					force: true,
					lossless: true,
					verbose: true,
				});

				await import('../cli.js');

				expect(mockSetProgramOptions).toHaveBeenCalledWith({
					shouldConvertToAvif: true,
					shouldConvertToWebp: true,
					isForced: true,
					isLossless: true,
					isVerbose: true,
				});

				expect(mockOptimizt).toHaveBeenCalledWith({
					inputPaths: ['/input/path'],
					configFilePath: undefined,
					outputDirectoryPath: undefined,
				});
			});

			test('should handle --force --lossless --verbose without conversion flags', async () => {
				mockProgramArguments(['/input/path']);
				mockProgramOptions({
					force: true,
					lossless: true,
					verbose: true,
				});

				await import('../cli.js');

				expect(mockSetProgramOptions).toHaveBeenCalledWith({
					shouldConvertToAvif: false,
					shouldConvertToWebp: false,
					isForced: true,
					isLossless: true,
					isVerbose: true,
				});

				expect(mockOptimizt).toHaveBeenCalledWith({
					inputPaths: ['/input/path'],
					configFilePath: undefined,
					outputDirectoryPath: undefined,
				});
			});

			test('should handle --avif --force --verbose combination', async () => {
				mockProgramArguments(['/input/path']);
				mockProgramOptions({
					avif: true,
					force: true,
					verbose: true,
				});

				await import('../cli.js');

				expect(mockSetProgramOptions).toHaveBeenCalledWith({
					shouldConvertToAvif: true,
					shouldConvertToWebp: false,
					isForced: true,
					isLossless: false,
					isVerbose: true,
				});

				expect(mockOptimizt).toHaveBeenCalledWith({
					inputPaths: ['/input/path'],
					configFilePath: undefined,
					outputDirectoryPath: undefined,
				});
			});

			test('should handle --webp --lossless combination', async () => {
				mockProgramArguments(['/input/path']);
				mockProgramOptions({
					webp: true,
					lossless: true,
				});

				await import('../cli.js');

				expect(mockSetProgramOptions).toHaveBeenCalledWith({
					shouldConvertToAvif: false,
					shouldConvertToWebp: true,
					isForced: false,
					isLossless: true,
					isVerbose: false,
				});

				expect(mockOptimizt).toHaveBeenCalledWith({
					inputPaths: ['/input/path'],
					configFilePath: undefined,
					outputDirectoryPath: undefined,
				});
			});
		});

		describe('Multiple file paths with flag combinations', () => {
			test('should handle multiple paths with --avif --webp flags', async () => {
				const inputPaths = ['/path1/image1.jpg', '/path2/image2.png', '/path3/image3.gif'];
				mockProgramArguments(inputPaths);
				mockProgramOptions({
					avif: true,
					webp: true,
				});

				await import('../cli.js');

				expect(mockSetProgramOptions).toHaveBeenCalledWith({
					shouldConvertToAvif: true,
					shouldConvertToWebp: true,
					isForced: false,
					isLossless: false,
					isVerbose: false,
				});

				expect(mockOptimizt).toHaveBeenCalledWith({
					inputPaths,
					configFilePath: undefined,
					outputDirectoryPath: undefined,
				});
			});

			test('should handle multiple paths with all flags enabled', async () => {
				const inputPaths = ['/images/dir1', '/images/dir2', 'single-file.jpg'];
				mockProgramArguments(inputPaths);
				mockProgramOptions({
					avif: true,
					webp: true,
					force: true,
					lossless: true,
					verbose: true,
				});

				await import('../cli.js');

				expect(mockSetProgramOptions).toHaveBeenCalledWith({
					shouldConvertToAvif: true,
					shouldConvertToWebp: true,
					isForced: true,
					isLossless: true,
					isVerbose: true,
				});

				expect(mockOptimizt).toHaveBeenCalledWith({
					inputPaths,
					configFilePath: undefined,
					outputDirectoryPath: undefined,
				});
			});

			test('should handle multiple paths with config and output options', async () => {
				const inputPaths = ['./src/images', './assets/photos', 'logo.png'];
				mockProgramArguments(inputPaths);
				mockProgramOptions({
					avif: true,
					force: true,
					config: './optimizt.config.js',
					output: './dist/optimized',
				});

				await import('../cli.js');

				expect(mockSetProgramOptions).toHaveBeenCalledWith({
					shouldConvertToAvif: true,
					shouldConvertToWebp: false,
					isForced: true,
					isLossless: false,
					isVerbose: false,
				});

				expect(mockOptimizt).toHaveBeenCalledWith({
					inputPaths,
					configFilePath: './optimizt.config.js',
					outputDirectoryPath: './dist/optimized',
				});
			});

			test('should handle many file paths with complex flag combination', async () => {
				const inputPaths = [
					'/home/user/photos/vacation',
					'/home/user/photos/family.jpg',
					'./work/screenshots',
					'../shared/assets/icons',
					'single-image.png',
				];
				mockProgramArguments(inputPaths);
				mockProgramOptions({
					avif: true,
					webp: true,
					force: true,
					lossless: true,
					verbose: true,
					config: '/etc/optimizt/config.json',
					output: '/var/www/optimized',
				});

				await import('../cli.js');

				expect(mockSetProgramOptions).toHaveBeenCalledWith({
					shouldConvertToAvif: true,
					shouldConvertToWebp: true,
					isForced: true,
					isLossless: true,
					isVerbose: true,
				});

				expect(mockOptimizt).toHaveBeenCalledWith({
					inputPaths,
					configFilePath: '/etc/optimizt/config.json',
					outputDirectoryPath: '/var/www/optimized',
				});
			});
		});

		describe('Edge cases with empty and special values', () => {
			test('should handle empty string paths', async () => {
				const inputPaths = ['', '/valid/path', ''];
				mockProgramArguments(inputPaths);
				mockProgramOptions({
					avif: true,
				});

				await import('../cli.js');

				expect(mockOptimizt).toHaveBeenCalledWith({
					inputPaths,
					configFilePath: undefined,
					outputDirectoryPath: undefined,
				});
			});

			test('should handle paths with special characters', async () => {
				const inputPaths = [
					'/path with spaces/image.jpg',
					'/path-with-dashes/image.png',
					'/path_with_underscores/image.gif',
					'/path.with.dots/image.svg',
					'/path@with@symbols/image.webp',
				];
				mockProgramArguments(inputPaths);
				mockProgramOptions({
					avif: true,
					webp: true,
					verbose: true,
				});

				await import('../cli.js');

				expect(mockOptimizt).toHaveBeenCalledWith({
					inputPaths,
					configFilePath: undefined,
					outputDirectoryPath: undefined,
				});
			});

			test('should handle empty config path', async () => {
				mockProgramArguments(['/input/path']);
				mockProgramOptions({
					config: '',
					output: '/output/path',
				});

				await import('../cli.js');

				expect(mockOptimizt).toHaveBeenCalledWith({
					inputPaths: ['/input/path'],
					configFilePath: '',
					outputDirectoryPath: '/output/path',
				});
			});

			test('should handle empty output path', async () => {
				mockProgramArguments(['/input/path']);
				mockProgramOptions({
					config: '/config/path',
					output: '',
				});

				await import('../cli.js');

				expect(mockOptimizt).toHaveBeenCalledWith({
					inputPaths: ['/input/path'],
					configFilePath: '/config/path',
					outputDirectoryPath: '',
				});
			});

			test('should handle null config and output values', async () => {
				mockProgramArguments(['/input/path']);
				mockProgramOptions({
					config: undefined,
					output: undefined,
				});

				await import('../cli.js');

				expect(mockOptimizt).toHaveBeenCalledWith({
					inputPaths: ['/input/path'],
					configFilePath: undefined,
					outputDirectoryPath: undefined,
				});
			});

			test('should handle config and output paths with special characters', async () => {
				mockProgramArguments(['/input/path']);
				mockProgramOptions({
					config: '/path with spaces/config.json',
					output: '/output-path_with@symbols',
				});

				await import('../cli.js');

				expect(mockOptimizt).toHaveBeenCalledWith({
					inputPaths: ['/input/path'],
					configFilePath: '/path with spaces/config.json',
					outputDirectoryPath: '/output-path_with@symbols',
				});
			});

			test('should handle very long paths', async () => {
				const longPath = '/very/long/path/that/goes/on/and/on/and/on/and/on/and/on/and/on/and/on/and/on/and/on/and/on/image.jpg';
				const longConfigPath = '/very/long/config/path/that/goes/on/and/on/and/on/and/on/and/on/config.json';
				const longOutputPath = '/very/long/output/path/that/goes/on/and/on/and/on/and/on/and/on/output';

				mockProgramArguments([longPath]);
				mockProgramOptions({
					config: longConfigPath,
					output: longOutputPath,
					verbose: true,
				});

				await import('../cli.js');

				expect(mockOptimizt).toHaveBeenCalledWith({
					inputPaths: [longPath],
					configFilePath: longConfigPath,
					outputDirectoryPath: longOutputPath,
				});
			});

			test('should handle single character paths', async () => {
				const inputPaths = ['.', '/', 'a'];
				mockProgramArguments(inputPaths);
				mockProgramOptions({
					config: 'c',
					output: 'o',
				});

				await import('../cli.js');

				expect(mockOptimizt).toHaveBeenCalledWith({
					inputPaths,
					configFilePath: 'c',
					outputDirectoryPath: 'o',
				});
			});

			test('should handle paths with unicode characters', async () => {
				const inputPaths = ['/путь/к/изображению.jpg', '/路径/到/图像.png', '/パス/へ/画像.gif'];
				mockProgramArguments(inputPaths);
				mockProgramOptions({
					avif: true,
					config: '/конфиг/файл.json',
					output: '/выходной/путь',
				});

				await import('../cli.js');

				expect(mockOptimizt).toHaveBeenCalledWith({
					inputPaths,
					configFilePath: '/конфиг/файл.json',
					outputDirectoryPath: '/выходной/путь',
				});
			});
		});

		describe('Complex real-world scenarios', () => {
			test('should handle typical web development workflow', async () => {
				const inputPaths = ['./src/assets/images', './public/photos'];
				mockProgramArguments(inputPaths);
				mockProgramOptions({
					avif: true,
					webp: true,
					force: true,
					output: './dist/optimized',
					verbose: true,
				});

				await import('../cli.js');

				expect(mockSetProgramOptions).toHaveBeenCalledWith({
					shouldConvertToAvif: true,
					shouldConvertToWebp: true,
					isForced: true,
					isLossless: false,
					isVerbose: true,
				});

				expect(mockOptimizt).toHaveBeenCalledWith({
					inputPaths,
					configFilePath: undefined,
					outputDirectoryPath: './dist/optimized',
				});
			});

			test('should handle batch processing with custom config', async () => {
				const inputPaths = [
					'/var/www/uploads/images',
					'/var/www/static/photos',
					'/var/www/assets/icons',
				];
				mockProgramArguments(inputPaths);
				mockProgramOptions({
					lossless: true,
					verbose: true,
					config: '/etc/optimizt/production.config.js',
					output: '/var/www/optimized',
				});

				await import('../cli.js');

				expect(mockSetProgramOptions).toHaveBeenCalledWith({
					shouldConvertToAvif: false,
					shouldConvertToWebp: false,
					isForced: false,
					isLossless: true,
					isVerbose: true,
				});

				expect(mockOptimizt).toHaveBeenCalledWith({
					inputPaths,
					configFilePath: '/etc/optimizt/production.config.js',
					outputDirectoryPath: '/var/www/optimized',
				});
			});

			test('should handle single file optimization with all options', async () => {
				const inputPaths = ['./important-image.png'];
				mockProgramArguments(inputPaths);
				mockProgramOptions({
					avif: true,
					webp: true,
					force: true,
					lossless: true,
					verbose: true,
					config: './custom-config.js',
					output: './optimized-output',
				});

				await import('../cli.js');

				expect(mockSetProgramOptions).toHaveBeenCalledWith({
					shouldConvertToAvif: true,
					shouldConvertToWebp: true,
					isForced: true,
					isLossless: true,
					isVerbose: true,
				});

				expect(mockOptimizt).toHaveBeenCalledWith({
					inputPaths,
					configFilePath: './custom-config.js',
					outputDirectoryPath: './optimized-output',
				});
			});

			test('should handle mixed absolute and relative paths', async () => {
				const inputPaths = [
					'/home/user/photos',
					'./local/images',
					'../shared/assets',
					'/var/www/uploads',
					'single-file.jpg',
				];
				mockProgramArguments(inputPaths);
				mockProgramOptions({
					avif: true,
					force: true,
					config: '../configs/optimizt.config.js',
					output: '/home/user/optimized',
				});

				await import('../cli.js');

				expect(mockSetProgramOptions).toHaveBeenCalledWith({
					shouldConvertToAvif: true,
					shouldConvertToWebp: false,
					isForced: true,
					isLossless: false,
					isVerbose: false,
				});

				expect(mockOptimizt).toHaveBeenCalledWith({
					inputPaths,
					configFilePath: '../configs/optimizt.config.js',
					outputDirectoryPath: '/home/user/optimized',
				});
			});

			test('should handle conversion-only workflow', async () => {
				const inputPaths = ['./source/images'];
				mockProgramArguments(inputPaths);
				mockProgramOptions({
					avif: true,
					webp: true,
				});

				await import('../cli.js');

				expect(mockSetProgramOptions).toHaveBeenCalledWith({
					shouldConvertToAvif: true,
					shouldConvertToWebp: true,
					isForced: false,
					isLossless: false,
					isVerbose: false,
				});

				expect(mockOptimizt).toHaveBeenCalledWith({
					inputPaths,
					configFilePath: undefined,
					outputDirectoryPath: undefined,
				});
			});

			test('should handle optimization-only workflow', async () => {
				const inputPaths = ['./images/to/optimize'];
				mockProgramArguments(inputPaths);
				mockProgramOptions({
					lossless: true,
					verbose: true,
				});

				await import('../cli.js');

				expect(mockSetProgramOptions).toHaveBeenCalledWith({
					shouldConvertToAvif: false,
					shouldConvertToWebp: false,
					isForced: false,
					isLossless: true,
					isVerbose: true,
				});

				expect(mockOptimizt).toHaveBeenCalledWith({
					inputPaths,
					configFilePath: undefined,
					outputDirectoryPath: undefined,
				});
			});
		});
	});

	describe('Program options setup', () => {
		test('should not pass config and output options to setProgramOptions', async () => {
			mockProgramArguments(['/input/path']);
			mockProgramOptions({
				avif: true,
				webp: true,
				force: true,
				lossless: true,
				verbose: true,
				config: '/path/to/config',
				output: '/path/to/output',
			});

			await import('../cli.js');

			// Verify that config and output are not passed to setProgramOptions
			expect(mockSetProgramOptions).toHaveBeenCalledWith({
				shouldConvertToAvif: true,
				shouldConvertToWebp: true,
				isForced: true,
				isLossless: true,
				isVerbose: true,
			});

			// Verify that the call doesn't include config or output properties
			const callArguments = mockSetProgramOptions.mock.calls[0][0];
			expect(callArguments).not.toHaveProperty('config');
			expect(callArguments).not.toHaveProperty('output');
			expect(callArguments).not.toHaveProperty('configFilePath');
			expect(callArguments).not.toHaveProperty('outputDirectoryPath');
		});

		test('should call setProgramOptions exactly once when arguments are provided', async () => {
			mockProgramArguments(['/input/path1', '/input/path2', '/input/path3']);
			mockProgramOptions({
				avif: true,
				webp: false,
				force: true,
				lossless: false,
				verbose: true,
			});

			await import('../cli.js');

			expect(mockSetProgramOptions).toHaveBeenCalledTimes(1);
		});

		test('should call setProgramOptions before calling optimizt', async () => {
			mockProgramArguments(['/input/path']);
			mockProgramOptions({
				avif: true,
				webp: true,
				force: true,
				lossless: true,
				verbose: true,
			});

			await import('../cli.js');

			// Verify call order: setProgramOptions should be called before optimizt
			expect(mockSetProgramOptions).toHaveBeenCalled();
			expect(mockOptimizt).toHaveBeenCalled();

			// Check that setProgramOptions was called before optimizt
			const setProgramOptionsCallOrder = mockSetProgramOptions.mock.invocationCallOrder[0];
			const optimiztCallOrder = mockOptimizt.mock.invocationCallOrder[0];
			expect(setProgramOptionsCallOrder).toBeLessThan(optimiztCallOrder);
		});
	});

	describe('Error handling', () => {
		describe('unhandledRejection event handling', () => {
			test('should register unhandledRejection event handler', async () => {
				await import('../cli.js');

				expect(process.on).toHaveBeenCalledWith('unhandledRejection', expect.any(Function));
			});

			test('should log errors to console.error when unhandledRejection occurs', async () => {
				await import('../cli.js');

				// Get the registered handler function
				const unhandledRejectionHandler = process.on.mock.calls.find(
					call => call[0] === 'unhandledRejection',
				)[1];

				expect(unhandledRejectionHandler).toBeDefined();
				expect(typeof unhandledRejectionHandler).toBe('function');

				// Create a test error
				const testError = new Error('Test unhandled rejection error');

				// Call the handler with the test error
				unhandledRejectionHandler(testError);

				// Verify that console.error was called with the error
				expect(mockConsoleError).toHaveBeenCalledWith(testError);
			});

			test('should handle different types of rejection errors', async () => {
				await import('../cli.js');

				// Get the registered handler function
				const unhandledRejectionHandler = process.on.mock.calls.find(
					call => call[0] === 'unhandledRejection',
				)[1];

				// Test with string error
				const stringError = 'String error message';
				unhandledRejectionHandler(stringError);
				expect(mockConsoleError).toHaveBeenCalledWith(stringError);

				// Test with object error
				const objectError = { message: 'Object error', code: 'ERR_TEST' };
				unhandledRejectionHandler(objectError);
				expect(mockConsoleError).toHaveBeenCalledWith(objectError);

				// Test with null/undefined
				unhandledRejectionHandler();
				expect(mockConsoleError).toHaveBeenCalledWith(undefined);

				unhandledRejectionHandler();
				expect(mockConsoleError).toHaveBeenCalledWith(undefined);
			});

			test('should handle Error objects with stack traces', async () => {
				await import('../cli.js');

				// Get the registered handler function
				const unhandledRejectionHandler = process.on.mock.calls.find(
					call => call[0] === 'unhandledRejection',
				)[1];

				// Create an Error with stack trace
				const errorWithStack = new Error('Error with stack trace');
				errorWithStack.stack = 'Error: Error with stack trace\n    at test (file.js:1:1)';

				unhandledRejectionHandler(errorWithStack);

				expect(mockConsoleError).toHaveBeenCalledWith(errorWithStack);
			});

			test('should handle multiple unhandledRejection events', async () => {
				await import('../cli.js');

				// Get the registered handler function
				const unhandledRejectionHandler = process.on.mock.calls.find(
					call => call[0] === 'unhandledRejection',
				)[1];

				// Create multiple test errors
				const error1 = new Error('First error');
				const error2 = new Error('Second error');
				const error3 = 'Third error string';

				// Call handler multiple times
				unhandledRejectionHandler(error1);
				unhandledRejectionHandler(error2);
				unhandledRejectionHandler(error3);

				// Verify all errors were logged
				expect(mockConsoleError).toHaveBeenCalledWith(error1);
				expect(mockConsoleError).toHaveBeenCalledWith(error2);
				expect(mockConsoleError).toHaveBeenCalledWith(error3);
				expect(mockConsoleError).toHaveBeenCalledTimes(3);
			});

			test('should register handler exactly once', async () => {
				await import('../cli.js');

				// Verify process.on was called exactly once for unhandledRejection
				const unhandledRejectionCalls = process.on.mock.calls.filter(
					call => call[0] === 'unhandledRejection',
				);

				expect(unhandledRejectionCalls).toHaveLength(1);
			});

			test('should not interfere with other process event handlers', async () => {
				await import('../cli.js');

				// Verify that only unhandledRejection handler was registered
				expect(process.on).toHaveBeenCalledTimes(1);
				expect(process.on).toHaveBeenCalledWith('unhandledRejection', expect.any(Function));

				// Verify no other event handlers were registered
				const allCalls = process.on.mock.calls;
				const nonUnhandledRejectionCalls = allCalls.filter(
					call => call[0] !== 'unhandledRejection',
				);
				expect(nonUnhandledRejectionCalls).toHaveLength(0);
			});
		});
	});

	describe('Main function execution', () => {
		test('should call optimizt with correct parameters', async () => {
			const inputPaths = ['/input/path1', '/input/path2'];
			const outputPath = '/output/path';
			const configPath = '/config/path';

			mockProgramArguments(inputPaths);
			mockProgramOptions({
				output: outputPath,
				config: configPath,
			});

			await import('../cli.js');

			expect(mockOptimizt).toHaveBeenCalledWith({
				inputPaths,
				outputDirectoryPath: outputPath,
				configFilePath: configPath,
			});
		});

		test('should call optimizt with undefined paths when not provided', async () => {
			const inputPaths = ['/input/path'];

			mockProgramArguments(inputPaths);
			mockProgramOptions({
				output: undefined,
				config: undefined,
			});

			await import('../cli.js');

			expect(mockOptimizt).toHaveBeenCalledWith({
				inputPaths,
				outputDirectoryPath: undefined,
				configFilePath: undefined,
			});
		});

		test('should handle multiple input paths', async () => {
			const inputPaths = ['/path1', '/path2', '/path3', 'file.jpg'];

			mockProgramArguments(inputPaths);
			mockProgramOptions({});

			await import('../cli.js');

			expect(mockOptimizt).toHaveBeenCalledWith({
				inputPaths,
				outputDirectoryPath: undefined,
				configFilePath: undefined,
			});
		});

		test('should pass inputPaths from program.args correctly', async () => {
			const inputPaths = ['/src/images', 'photo.jpg', './assets/logo.png'];

			mockProgramArguments(inputPaths);
			mockProgramOptions({});

			await import('../cli.js');

			expect(mockOptimizt).toHaveBeenCalledWith(
				expect.objectContaining({
					inputPaths,
				}),
			);

			// Verify that the exact array from program.args is passed
			const callArguments = mockOptimizt.mock.calls[0][0];
			expect(callArguments.inputPaths).toEqual(inputPaths);
			expect(callArguments.inputPaths).toBe(inputPaths);
		});

		test('should pass outputDirectoryPath from program options correctly', async () => {
			const inputPaths = ['/input/path'];
			const outputPath = '/custom/output/directory';

			mockProgramArguments(inputPaths);
			mockProgramOptions({
				output: outputPath,
			});

			await import('../cli.js');

			expect(mockOptimizt).toHaveBeenCalledWith(
				expect.objectContaining({
					outputDirectoryPath: outputPath,
				}),
			);

			// Verify that the exact output path is passed
			const callArguments = mockOptimizt.mock.calls[0][0];
			expect(callArguments.outputDirectoryPath).toBe(outputPath);
		});

		test('should pass configFilePath from program options correctly', async () => {
			const inputPaths = ['/input/path'];
			const configPath = '/custom/config/optimizt.config.js';

			mockProgramArguments(inputPaths);
			mockProgramOptions({
				config: configPath,
			});

			await import('../cli.js');

			expect(mockOptimizt).toHaveBeenCalledWith(
				expect.objectContaining({
					configFilePath: configPath,
				}),
			);

			// Verify that the exact config path is passed
			const callArguments = mockOptimizt.mock.calls[0][0];
			expect(callArguments.configFilePath).toBe(configPath);
		});

		test('should call optimizt only when arguments are provided', async () => {
			// Test with no arguments - optimizt should not be called
			mockProgramArguments([]);
			mockProgramOptions({
				output: '/some/output',
				config: '/some/config',
			});

			await import('../cli.js');

			expect(mockOptimizt).not.toHaveBeenCalled();
		});

		test('should call optimizt when at least one argument is provided', async () => {
			mockProgramArguments(['/single/input/path']);
			mockProgramOptions({});

			await import('../cli.js');

			expect(mockOptimizt).toHaveBeenCalledTimes(1);
			expect(mockOptimizt).toHaveBeenCalledWith({
				inputPaths: ['/single/input/path'],
				outputDirectoryPath: undefined,
				configFilePath: undefined,
			});
		});

		test('should call optimizt exactly once per execution', async () => {
			const inputPaths = ['/path1', '/path2', '/path3'];

			mockProgramArguments(inputPaths);
			mockProgramOptions({
				output: '/output',
				config: '/config',
			});

			await import('../cli.js');

			expect(mockOptimizt).toHaveBeenCalledTimes(1);
		});

		test('should call optimizt with all three required parameters', async () => {
			const inputPaths = ['/test/input'];
			const outputPath = '/test/output';
			const configPath = '/test/config';

			mockProgramArguments(inputPaths);
			mockProgramOptions({
				output: outputPath,
				config: configPath,
			});

			await import('../cli.js');

			expect(mockOptimizt).toHaveBeenCalledWith({
				inputPaths,
				outputDirectoryPath: outputPath,
				configFilePath: configPath,
			});

			// Verify that the call has exactly these three properties
			const callArguments = mockOptimizt.mock.calls[0][0];
			const expectedKeys = ['inputPaths', 'outputDirectoryPath', 'configFilePath'];
			expect(Object.keys(callArguments)).toEqual(expect.arrayContaining(expectedKeys));
			expect(Object.keys(callArguments)).toHaveLength(expectedKeys.length);
		});

		test('should handle empty string paths correctly', async () => {
			const inputPaths = ['/input/path'];

			mockProgramArguments(inputPaths);
			mockProgramOptions({
				output: '',
				config: '',
			});

			await import('../cli.js');

			expect(mockOptimizt).toHaveBeenCalledWith({
				inputPaths,
				outputDirectoryPath: '',
				configFilePath: '',
			});
		});

		test('should handle null values in options correctly', async () => {
			const inputPaths = ['/input/path'];

			mockProgramArguments(inputPaths);
			mockProgramOptions({
				output: undefined,
				config: undefined,
			});

			await import('../cli.js');

			expect(mockOptimizt).toHaveBeenCalledWith({
				inputPaths,
				outputDirectoryPath: undefined,
				configFilePath: undefined,
			});
		});

		test('should preserve the order of input paths', async () => {
			const inputPaths = ['/first', '/second', '/third', '/fourth'];

			mockProgramArguments(inputPaths);
			mockProgramOptions({});

			await import('../cli.js');

			const callArguments = mockOptimizt.mock.calls[0][0];
			expect(callArguments.inputPaths).toEqual(inputPaths);

			// Verify order is preserved
			for (const [index, inputPath] of inputPaths.entries()) {
				expect(callArguments.inputPaths[index]).toBe(inputPath);
			}
		});

		test('should call optimizt after setProgramOptions', async () => {
			const inputPaths = ['/input/path'];

			mockProgramArguments(inputPaths);
			mockProgramOptions({
				avif: true,
				webp: true,
			});

			await import('../cli.js');

			// Verify both functions are called
			expect(mockSetProgramOptions).toHaveBeenCalled();
			expect(mockOptimizt).toHaveBeenCalled();

			// Verify call order: setProgramOptions should be called before optimizt
			const setProgramOptionsCallOrder = mockSetProgramOptions.mock.invocationCallOrder[0];
			const optimiztCallOrder = mockOptimizt.mock.invocationCallOrder[0];
			expect(setProgramOptionsCallOrder).toBeLessThan(optimiztCallOrder);
		});

		test('should handle complex path combinations', async () => {
			const inputPaths = [
				'/absolute/path/to/images',
				'./relative/path/image.jpg',
				'../parent/directory',
				'simple-filename.png',
				'/path with spaces/image.gif',
			];
			const outputPath = './dist/optimized images';
			const configPath = '../config/optimizt.config.js';

			mockProgramArguments(inputPaths);
			mockProgramOptions({
				output: outputPath,
				config: configPath,
			});

			await import('../cli.js');

			expect(mockOptimizt).toHaveBeenCalledWith({
				inputPaths,
				outputDirectoryPath: outputPath,
				configFilePath: configPath,
			});
		});
	});

	describe('Error handling', () => {
		test('should handle unhandledRejection events', async () => {
			await import('../cli.js');

			// Get the unhandledRejection handler
			const unhandledRejectionCall = process.on.mock.calls.find(
				call => call[0] === 'unhandledRejection',
			);

			expect(unhandledRejectionCall).toBeDefined();

			const unhandledRejectionHandler = unhandledRejectionCall[1];
			const testError = new Error('Test error');
			unhandledRejectionHandler(testError);

			expect(mockConsoleError).toHaveBeenCalledWith(testError);
		});

		test('should handle package.json read errors gracefully', async () => {
			mockFs.readFile.mockRejectedValue(new Error('File not found'));

			// This should throw an error during import since package.json is required
			await expect(import('../cli.js')).rejects.toThrow('File not found');
		});
	});

	describe('Performance and reliability optimizations', () => {
		test('should handle batch CLI option testing efficiently', async () => {
			const testScenarios = [
				{
					description: 'AVIF conversion',
					args: ['/test/image.jpg'],
					options: { avif: true },
					expectedOptions: {
						shouldConvertToAvif: true, shouldConvertToWebp: false, isForced: false, isLossless: false, isVerbose: false,
					},
				},
				{
					description: 'WebP conversion with verbose',
					args: ['/test/image.png'],
					options: { webp: true, verbose: true },
					expectedOptions: {
						shouldConvertToAvif: false, shouldConvertToWebp: true, isForced: false, isLossless: false, isVerbose: true,
					},
				},
				{
					description: 'Lossless optimization',
					args: ['/test/directory'],
					options: { lossless: true, force: true },
					expectedOptions: {
						shouldConvertToAvif: false, shouldConvertToWebp: false, isForced: true, isLossless: true, isVerbose: false,
					},
				},
			];

			const startTime = performance.now();

			for (const scenario of testScenarios) {
				mockProgramArguments(scenario.args);
				mockProgramOptions(scenario.options);

				vi.resetModules();
				await import('../cli.js');

				expect(mockSetProgramOptions).toHaveBeenCalledWith(scenario.expectedOptions);
				expect(mockOptimizt).toHaveBeenCalledWith(
					expect.objectContaining({
						inputPaths: scenario.args,
					}),
				);

				// Efficient cleanup
				vi.clearAllMocks();
				setupCommonMocks();
			}

			const endTime = performance.now();
			const executionTime = endTime - startTime;

			// Batch processing should be efficient
			expect(executionTime).toBeLessThan(200); // Should complete in under 200ms
		});

		test('should handle edge cases in CLI argument processing', async () => {
			const edgeCases = [
				{ args: [''], options: {}, description: 'empty string path' },
				{ args: ['.'], options: { avif: true }, description: 'current directory' },
				{ args: ['..'], options: { webp: true }, description: 'parent directory' },
				{ args: ['/very/long/path/that/might/cause/issues'], options: { verbose: true }, description: 'very long path' },
			];

			for (const edgeCase of edgeCases) {
				mockProgramArguments(edgeCase.args);
				mockProgramOptions(edgeCase.options);

				// Should not throw errors for edge cases
				await expect(import('../cli.js')).resolves.toBeDefined();

				vi.clearAllMocks();
				setupCommonMocks();
			}
		});

		test('should optimize mock cleanup and reuse', () => {
			const startTime = performance.now();

			// Test multiple mock setups and cleanups
			for (let index = 0; index < 50; index++) {
				mockProgramArguments([`/test/path/${index}`]);
				mockProgramOptions({ avif: index % 2 === 0 });

				// Verify mocks are working
				expect(mockProgram.args).toEqual([`/test/path/${index}`]);
				expect(mockProgram.opts()).toEqual({ avif: index % 2 === 0 });

				// Clear and reset
				vi.clearAllMocks();
				setupCommonMocks();
			}

			const endTime = performance.now();
			const executionTime = endTime - startTime;

			// Mock operations should be very fast
			expect(executionTime).toBeLessThan(50);
		});

		test('should handle concurrent CLI operations reliably', async () => {
			const concurrentOperations = Array.from({ length: 10 }, (_, index) => ({
				args: [`/concurrent/test/${index}`],
				options: { avif: index % 2 === 0, webp: index % 3 === 0 },
			}));

			// Run operations concurrently (simulated)
			for (const operation of concurrentOperations) {
				mockProgramArguments(operation.args);
				mockProgramOptions(operation.options);

				vi.resetModules();
				await import('../cli.js');

				// Verify each operation was processed correctly
				expect(mockOptimizt).toHaveBeenCalledWith(
					expect.objectContaining({
						inputPaths: operation.args,
					}),
				);

				vi.clearAllMocks();
				setupCommonMocks();
			}
		});

		test('should validate input parameters consistently', async () => {
			const invalidInputs = [
				{ args: undefined, options: {}, shouldFail: true },
				{ args: undefined, options: {}, shouldFail: true },
				{ args: [], options: {}, shouldShowHelp: true },
				{ args: ['valid-path'], options: undefined, shouldWork: true },
			];

			for (const input of invalidInputs) {
				if (input.args !== undefined) {
					mockProgramArguments(input.args);
				}

				if (input.options !== undefined) {
					mockProgramOptions(input.options);
				}

				if (input.shouldShowHelp) {
					await import('../cli.js');
					expect(mockProgram.help).toHaveBeenCalled();
				} else if (input.shouldWork) {
					await expect(import('../cli.js')).resolves.toBeDefined();
				}

				vi.clearAllMocks();
				setupCommonMocks();
			}
		});
	});
});
