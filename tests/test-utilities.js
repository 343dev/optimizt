import { vi } from 'vitest';

/**
 * Test utilities for optimizing test performance and reducing code duplication
 */

/**
 * Creates a standardized mock setup for CLI tests
 * @param {Object} options - Configuration options
 * @returns {Object} Mock setup object
 */
export function createCliMockSetup(options = {}) {
	const {
		packageJson = { version: '11.0.0', description: 'CLI image optimization tool' },
		programArgs: programArguments = [],
		programOptions = {},
		shouldThrowOnRead = false,
	} = options;

	const mockSetup = {
		fs: {
			readFile: shouldThrowOnRead
				? vi.fn().mockRejectedValue(new Error('File read error'))
				: vi.fn().mockResolvedValue(JSON.stringify(packageJson)),
		},
		path: {
			dirname: vi.fn().mockReturnValue('/mock/dirname'),
			join: vi.fn().mockReturnValue('/mock/path/package.json'),
		},
		fileURLToPath: vi.fn().mockReturnValue('/mock/file/path'),
		program: {
			option: vi.fn().mockReturnThis(),
			allowExcessArguments: vi.fn().mockReturnThis(),
			usage: vi.fn().mockReturnThis(),
			version: vi.fn().mockReturnThis(),
			description: vi.fn().mockReturnThis(),
			parse: vi.fn().mockReturnThis(),
			help: vi.fn(),
			args: programArguments,
			opts: vi.fn().mockReturnValue(programOptions),
		},
		optimizt: vi.fn().mockResolvedValue(),
		setProgramOptions: vi.fn(),
	};

	return mockSetup;
}

/**
 * Creates test data for various CLI scenarios
 * @returns {Object} Test data object
 */
export function createCliTestData() {
	return {
		paths: {
			single: ['/path/to/image.jpg'],
			multiple: ['/path1/image1.jpg', '/path2/image2.png', '/path3/image3.gif'],
			mixed: ['/path/to/images', '/path/to/image.jpg', './relative/path'],
			withSpaces: ['/path with spaces/image.jpg', '/another path/photo.png'],
			relative: ['./images/photo.jpg', '../assets/logo.png', 'icon.svg'],
			special: ['.', '..', '~'],
		},
		options: {
			allFlags: {
				avif: true,
				webp: true,
				force: true,
				lossless: true,
				verbose: true,
			},
			conversion: {
				avif: true,
				webp: true,
			},
			processing: {
				force: true,
				lossless: true,
				verbose: true,
			},
			paths: {
				config: '/path/to/config.json',
				output: '/path/to/output',
			},
		},
		packageJson: {
			valid: {
				version: '11.0.0',
				description: 'CLI image optimization tool',
				name: '@343dev/optimizt',
			},
			minimal: {
				version: '1.0.0',
			},
			empty: {},
			withNulls: {
				version: undefined,
				description: undefined,
			},
		},
	};
}

/**
 * Creates performance-optimized mock for repeated test scenarios
 * @param {string} _scenario - The test scenario type
 * @returns {Function} Mock function optimized for the scenario
 */
export function createOptimizedMock(_scenario) {
	const mocks = new Map();

	return function (key, defaultValue) {
		if (!mocks.has(key)) {
			mocks.set(key, vi.fn().mockReturnValue(defaultValue));
		}

		return mocks.get(key);
	};
}

/**
 * Batch test runner for reducing test execution time
 * @param {Array} testCases - Array of test case objects
 * @param {Function} testFunction - Function to run for each test case
 * @returns {Promise} Promise that resolves when all tests complete
 */
export async function runBatchTests(testCases, testFunction) {
	const results = [];

	// Run tests in smaller batches to avoid memory issues
	const batchSize = 5;
	const batches = [];
	for (let index = 0; index < testCases.length; index += batchSize) {
		const batch = testCases.slice(index, index + batchSize);
		batches.push(batch);
	}

	const batchPromises = batches.map(batch =>
		Promise.all(batch.map(async testCase => testFunction(testCase))));

	const allBatchResults = await Promise.all(batchPromises);
	for (const batchResults of allBatchResults) {
		results.push(...batchResults);
	}

	return results;
}

/**
 * Creates edge case test data for comprehensive testing
 * @returns {Object} Edge case test data
 */
export function createEdgeCaseData() {
	return {
		invalidPaths: [
			'', // empty string
			undefined, // null value
			undefined, // undefined value
			'   ', // whitespace only
			'\n\t', // special characters
			'path/with/\0/null', // null character
			'very'.repeat(100), // extremely long path
		],
		invalidOptions: [
			{ avif: 'invalid' },
			{ webp: 123 },
			{ force: [] },
			{ lossless: {} },
			{ verbose: Symbol('test') },
		],
		errorScenarios: [
			{ type: 'file-not-found', error: new Error('ENOENT: no such file or directory') },
			{ type: 'permission-denied', error: new Error('EACCES: permission denied') },
			{ type: 'invalid-json', error: new SyntaxError('Unexpected token in JSON') },
			{ type: 'network-error', error: new Error('ENOTFOUND: getaddrinfo') },
			{ type: 'timeout', error: new Error('ETIMEDOUT: operation timed out') },
		],
	};
}

/**
 * Memory-efficient mock cleaner for large test suites
 * @param {Array} mocks - Array of mocks to clean
 */
export function cleanMocksEfficiently(mocks) {
	// Clear mocks in batches to avoid blocking the event loop
	const batchSize = 10;
	let index = 0;

	function clearBatch() {
		const endIndex = Math.min(index + batchSize, mocks.length);
		for (let index_ = index; index_ < endIndex; index_++) {
			if (mocks[index_] && typeof mocks[index_].mockClear === 'function') {
				mocks[index_].mockClear();
			}
		}

		index = endIndex;

		if (index < mocks.length) {
			setImmediate(clearBatch);
		}
	}

	clearBatch();
}
