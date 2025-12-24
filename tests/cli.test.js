import {
	afterEach, beforeEach, describe, expect, test,
} from 'vitest';

import { execSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { calculateRatio } from '../lib/calculate-ratio.js';

const dirname = path.dirname(fileURLToPath(import.meta.url));

const cliPath = path.resolve('cli.js');
const images = path.resolve(dirname, 'images');

let temporary;
let workDirectory;

beforeEach(() => {
	temporary = fs.mkdtempSync(path.join(os.tmpdir(), 'optimizt-test-'));
	workDirectory = `${temporary}${path.sep}`;
	copyRecursive(images, temporary);
});

afterEach(() => {
	if (temporary) {
		fs.rmSync(temporary, { recursive: true });
	}
});

describe('CLI', () => {
	describe('Optimization', () => {
		describe('Lossy', () => {
			test('SVG should be optimized', () => {
				const file = 'svg-not-optimized.svg';
				const stdout = runCliWithParameters(`${workDirectory}${file}`);

				expectFileRatio({
					stdout, file, maxRatio: 85, minRatio: 80,
				});
			});

			test('JPEG/JPG should be optimized', () => {
				const file = 'jpeg-not-optimized.jpeg';
				const stdout = runCliWithParameters(`${workDirectory}${file}`);

				expectFileRatio({
					stdout, file, maxRatio: 55, minRatio: 50,
				});
			});

			test('PNG should be optimized', () => {
				const file = 'png-not-optimized.png';
				const stdout = runCliWithParameters(`${workDirectory}${file}`);

				expectFileRatio({
					stdout, file, maxRatio: 80, minRatio: 75,
				});
			});

			test('GIF should be optimized', () => {
				const file = 'gif-not-optimized.gif';
				const stdout = runCliWithParameters(`${workDirectory}${file}`);

				expectFileRatio({
					stdout, file, maxRatio: 45, minRatio: 35,
				});
			});

			test('Files should not be optimized if ratio <= 0', () => {
				const stdout = runCliWithParameters(`${workDirectory}svg-optimized.svg ${workDirectory}jpeg-one-pixel.jpg`);

				expectStringContains(stdout, 'Optimizing 2 images (lossy)...');
				expectStringContains(stdout, 'Done!');
				expectFileNotModified('svg-optimized.svg');
				expectFileNotModified('jpeg-one-pixel.jpg');
			});

			test('Files in provided directory should be optimized', () => {
				const stdout = runCliWithParameters(workDirectory);

				expectStringContains(stdout, 'Optimizing 8 images (lossy)...');
				expectTotalRatio({ maxRatio: 60, minRatio: 55, stdout });
			});
		});

		describe('Lossless (--lossless)', () => {
			test('JPEG/JPG should be optimized', () => {
				const file = 'jpeg-not-optimized.jpeg';
				const stdout = runCliWithParameters(`--lossless ${workDirectory}${file}`);

				expectFileRatio({
					stdout, file, maxRatio: 55, minRatio: 45,
				});
			});

			test('PNG should be optimized', () => {
				const file = 'png-not-optimized.png';
				const stdout = runCliWithParameters(`--lossless ${workDirectory}${file}`);

				expectFileRatio({
					stdout, file, maxRatio: 25, minRatio: 20,
				});
			});

			test('GIF should be optimized', () => {
				const file = 'gif-not-optimized.gif';
				const stdout = runCliWithParameters(`--lossless ${workDirectory}${file}`);

				expectFileRatio({
					stdout, file, maxRatio: 10, minRatio: 5,
				});
			});

			test('Files should not be optimized if ratio <= 0', () => {
				const stdout = runCliWithParameters(`--lossless ${workDirectory}jpeg-one-pixel.jpg`);

				expectStringContains(stdout, 'Optimizing 1 image (lossless)...');
				expectStringContains(stdout, 'Done!');
				expectFileNotModified('jpeg-one-pixel.jpg');
			});

			test('Files in provided directory should be optimized', () => {
				const stdout = runCliWithParameters(`--lossless ${workDirectory}`);

				expectStringContains(stdout, 'Optimizing 8 images (lossless)...');
				expectTotalRatio({ maxRatio: 25, minRatio: 15, stdout });
			});
		});
	});

	describe('Converting to AVIF (--avif)', () => {
		describe('Lossy', () => {
			test('JPEG should be converted', () => {
				const file = 'jpeg-not-optimized.jpeg';
				const stdout = runCliWithParameters(`--avif ${workDirectory}${file}`);

				expectFileRatio({
					stdout, file, maxRatio: 85, minRatio: 75, outputExt: 'avif',
				});
				expectFileNotModified(file);
			});

			test('PNG should be converted', () => {
				const file = 'png-not-optimized.png';
				const stdout = runCliWithParameters(`--avif ${workDirectory}${file}`);

				expectFileRatio({
					stdout, file, maxRatio: 95, minRatio: 90, outputExt: 'avif',
				});
				expectFileNotModified(file);
			});

			test('GIF should not be converted', () => {
				const file = 'gif-not-optimized.gif';
				const stdout = runCliWithParameters(`--avif ${workDirectory}${file}`);

				expectStringContains(stdout, 'Animated AVIF is not supported');
				expectFileNotModified(file);
				expectFileNotExists('gif-not-optimized.avif');
			});

			test('Files in provided directory should be converted', () => {
				const fileBasename = 'png-not-optimized';
				const stdout = runCliWithParameters(`--avif ${workDirectory}`);
				const stdoutRatio = grepTotalRatio(stdout);

				expectStringContains(stdout, 'Converting 6 images (lossy)...');
				expectRatio(stdoutRatio, 80, 85);
				expectFileNotModified(`${fileBasename}.png`);
				expectFileExists(`${fileBasename}.avif`);
			});
		});

		describe('Lossless (--lossless)', () => {
			// TODO: In lossless mode JPEG file size is always smaller than AVIF
			// test('JPEG should be converted', () => {});

			test('PNG should be converted', () => {
				const file = 'png-not-optimized.png';
				const stdout = runCliWithParameters(`--avif --lossless ${workDirectory}${file}`);

				expectFileRatio({
					stdout, file, maxRatio: 30, minRatio: 20, outputExt: 'avif',
				});
				expectFileNotModified(file);
			});

			test('GIF should not be converted', () => {
				const file = 'gif-not-optimized.gif';
				const stdout = runCliWithParameters(`--avif --lossless ${workDirectory}${file}`);

				expectStringContains(stdout, 'Animated AVIF is not supported');
				expectFileNotModified(file);
				expectFileNotExists('gif-not-optimized.avif');
			});

			test('Files in provided directory should be converted (except GIF)', () => {
				const fileBasename = 'png-not-optimized';
				const stdout = runCliWithParameters(`--avif --lossless ${workDirectory}`);
				const stdoutRatio = grepTotalRatio(stdout);

				expectStringContains(stdout, 'Converting 6 images (lossless)...');
				expectRatio(stdoutRatio, 15, 20);
				expectFileNotModified(`${fileBasename}.png`);
				expectFileExists(`${fileBasename}.avif`);

				expectStringContains(stdout, 'Animated AVIF is not supported');
				expectFileNotExists('gif-not-optimized.avif');
			});
		});
	});

	describe('Converting to WebP (--webp)', () => {
		describe('Lossy', () => {
			test('JPEG should be converted', () => {
				const file = 'jpeg-not-optimized.jpeg';
				const stdout = runCliWithParameters(`--webp ${workDirectory}${file}`);

				expectFileRatio({
					stdout, file, maxRatio: 75, minRatio: 70, outputExt: 'webp',
				});
				expectFileNotModified(file);
			});

			test('PNG should be converted', () => {
				const file = 'png-not-optimized.png';
				const stdout = runCliWithParameters(`--webp ${workDirectory}${file}`);

				expectFileRatio({
					stdout, file, maxRatio: 85, minRatio: 80, outputExt: 'webp',
				});
				expectFileNotModified(file);
			});

			test('GIF should be converted', () => {
				const file = 'gif-not-optimized.gif';
				const stdout = runCliWithParameters(`--webp ${workDirectory}${file}`);

				expectFileRatio({
					stdout, file, maxRatio: 30, minRatio: 25, outputExt: 'webp',
				});
				expectFileNotModified(file);
			});

			test('Files in provided directory should be converted', () => {
				const fileBasename = 'png-not-optimized';
				const stdout = runCliWithParameters(`--webp ${workDirectory}`);
				const stdoutRatio = grepTotalRatio(stdout);

				expectStringContains(stdout, 'Converting 6 images (lossy)...');
				expectRatio(stdoutRatio, 55, 60);
				expectFileNotModified(`${fileBasename}.png`);
				expectFileExists(`${fileBasename}.webp`);
			});
		});

		describe('Lossless (--lossless)', () => {
			test('JPEG should be converted', () => {
				const file = 'jpeg-one-pixel.jpg';
				const stdout = runCliWithParameters(`--webp --lossless ${workDirectory}${file}`);

				expectFileRatio({
					stdout, file, maxRatio: 85, minRatio: 80, outputExt: 'webp',
				});
				expectFileNotModified(file);
			});

			test('PNG should be converted', () => {
				const file = 'png-not-optimized.png';
				const stdout = runCliWithParameters(`--webp --lossless ${workDirectory}${file}`);

				expectFileRatio({
					stdout, file, maxRatio: 50, minRatio: 45, outputExt: 'webp',
				});
				expectFileNotModified(file);
			});

			test('GIF should be converted', () => {
				const file = 'gif-not-optimized.gif';
				const stdout = runCliWithParameters(`--webp --lossless ${workDirectory}${file}`);

				expectFileRatio({
					stdout, file, maxRatio: 25, minRatio: 20, outputExt: 'webp',
				});
				expectFileNotModified(file);
			});

			test('Files in provided directory should be converted', () => {
				const fileBasename = 'png-not-optimized';
				const stdout = runCliWithParameters(`--webp --lossless ${workDirectory}`);
				const stdoutRatio = grepTotalRatio(stdout);

				expectStringContains(stdout, 'Converting 6 images (lossless)...');
				expectRatio(stdoutRatio, 30, 35);
				expectFileNotModified(`${fileBasename}.png`);
				expectFileExists(`${fileBasename}.webp`);
			});
		});
	});

	describe('Converting to AVIF and WebP at the same time (--avif --webp)', () => {
		describe('Lossy', () => {
			test('AVIF and WebP should be created', () => {
				const fileBasename = 'png-not-optimized';
				const stdout = runCliWithParameters(`--avif --webp ${workDirectory}${fileBasename}.png`);
				const stdoutRatio = grepTotalRatio(stdout);

				expectStringContains(stdout, 'Converting 1 image (lossy)...');
				expectStringContains(stdout, path.join(temporary, `${fileBasename}.avif`));
				expectStringContains(stdout, path.join(temporary, `${fileBasename}.webp`));
				expectRatio(stdoutRatio, 85, 90);
				expectFileNotModified(`${fileBasename}.png`);
				expectFileExists(`${fileBasename}.avif`);
				expectFileExists(`${fileBasename}.webp`);
			});
		});

		describe('Lossless (--lossless)', () => {
			test('AVIF and WebP should be created', () => {
				const fileBasename = 'png-not-optimized';
				const stdout = runCliWithParameters(`--avif --webp --lossless ${workDirectory}${fileBasename}.png`);
				const stdoutRatio = grepTotalRatio(stdout);

				expectStringContains(stdout, 'Converting 1 image (lossless)...');
				expectStringContains(stdout, path.join(temporary, `${fileBasename}.avif`));
				expectStringContains(stdout, path.join(temporary, `${fileBasename}.webp`));
				expectRatio(stdoutRatio, 35, 40);
				expectFileNotModified(`${fileBasename}.png`);
				expectFileExists(`${fileBasename}.avif`);
				expectFileExists(`${fileBasename}.webp`);
			});
		});
	});

	describe('Force rewrite AVIF or WebP (--force)', () => {
		test('Should not be overwritten', () => {
			const fileBasename = 'png-not-optimized';
			const parameters = `--verbose --avif --webp ${workDirectory}${fileBasename}.png`;

			runCliWithParameters(parameters);
			const stdout = runCliWithParameters(parameters);

			expectStringContains(stdout, `File already exists, '${workDirectory}${fileBasename}.avif'`);
			expectStringContains(stdout, `File already exists, '${workDirectory}${fileBasename}.webp'`);
		});

		test('Should be overwritten', () => {
			const fileBasename = 'png-not-optimized';
			const parameters = `--avif --webp --force ${workDirectory}${fileBasename}.png`;

			runCliWithParameters(parameters);
			const stdout = runCliWithParameters(parameters);

			expectStringNotContains(stdout, `File already exists, '${workDirectory}${fileBasename}.avif'`);
			expectStringNotContains(stdout, `File already exists, '${workDirectory}${fileBasename}.webp'`);
		});
	});

	describe('Output to provided directory (--output)', () => {
		let outputDirectory;

		beforeEach(() => {
			outputDirectory = fs.mkdtempSync(path.join(os.tmpdir(), 'optimizt-test-'));
		});

		afterEach(() => {
			if (outputDirectory) {
				fs.rmSync(outputDirectory, { recursive: true });
			}
		});

		describe('Optimization', () => {
			test('Should output one file', () => {
				const fileName = 'png-not-optimized.png';

				runCliWithParameters(`--output ${outputDirectory} ${workDirectory}${fileName}`);
				expect(fs.existsSync(path.join(outputDirectory, fileName))).toBeTruthy();
			});

			test('Should output list of files', () => {
				runCliWithParameters(`--output ${outputDirectory} ${workDirectory}*.jpg ${workDirectory}*.jpeg`);
				expect(fs.existsSync(path.join(outputDirectory, 'jpeg-low-quality.jpg'))).toBeTruthy();
				expect(fs.existsSync(path.join(outputDirectory, 'jpeg-not-optimized.jpeg'))).toBeTruthy();
			});
		});

		describe('Converting', () => {
			test('Should output one file', () => {
				const fileBasename = 'png-not-optimized';

				runCliWithParameters(`--avif --output ${outputDirectory} ${workDirectory}${fileBasename}.png`);
				expect(fs.existsSync(path.join(outputDirectory, `${fileBasename}.avif`))).toBeTruthy();
			});

			test('Should output list of files', () => {
				runCliWithParameters(`--avif --output ${outputDirectory} ${workDirectory}*.jpg ${workDirectory}*.jpeg`);
				expect(fs.existsSync(path.join(outputDirectory, 'jpeg-low-quality.avif'))).toBeTruthy();
				expect(fs.existsSync(path.join(outputDirectory, 'jpeg-not-optimized.avif'))).toBeTruthy();
			});
		});
	});

	describe('Verbose mode (--verbose)', () => {
		test('Should be verbose', () => {
			const stdout = runCliWithParameters(`--verbose ${workDirectory}svg-optimized.svg`);
			expectStringContains(stdout, 'Nothing changed. Skipped');
		});

		test('Should not be verbose', () => {
			const stdout = runCliWithParameters(`${workDirectory}svg-optimized.svg`);
			expectStringNotContains(stdout, 'Nothing changed. Skipped');
		});
	});

	describe('Prefix and Suffix (--prefix --suffix)', () => {
		let outputDirectory;

		beforeEach(() => {
			outputDirectory = fs.mkdtempSync(path.join(os.tmpdir(), 'optimizt-test-'));
		});

		afterEach(() => {
			if (outputDirectory) {
				fs.rmSync(outputDirectory, { recursive: true });
			}
		});

		test('Should add prefix and suffix to optimized filenames', () => {
			const fileName = 'png-not-optimized.png';
			const expectedOutput = 'prepng-not-optimizedsuf.png';

			runCliWithParameters(`--prefix pre --suffix suf --output ${outputDirectory} ${workDirectory}${fileName}`);
			expect(fs.existsSync(path.join(outputDirectory, expectedOutput))).toBeTruthy();
		});

		test('Should add prefix and suffix to converted filenames', () => {
			const fileBasename = 'png-not-optimized';
			const expectedAvif = 'prepng-not-optimizedsuf.avif';
			const expectedWebp = 'prepng-not-optimizedsuf.webp';

			runCliWithParameters(`--avif --webp --prefix pre --suffix suf --output ${outputDirectory} ${workDirectory}${fileBasename}.png`);
			expect(fs.existsSync(path.join(outputDirectory, expectedAvif))).toBeTruthy();
			expect(fs.existsSync(path.join(outputDirectory, expectedWebp))).toBeTruthy();
		});

		test('Should sanitize forbidden characters in prefix and suffix', () => {
			const fileName = 'png-not-optimized.png';
			const expectedOutput = 'unsafepng-not-optimizedunsafe.png';

			runCliWithParameters(`--prefix "<un:safe>" --suffix "<un:safe>" --output ${outputDirectory} ${workDirectory}${fileName}`);
			expect(fs.existsSync(path.join(outputDirectory, expectedOutput))).toBeTruthy();
		});
	});

	describe('Help (--help)', () => {
		const helpString = `\
Usage: cli [options] <dir> <file ...>

CLI image optimization tool

Options:
  --avif               create AVIF and exit
  --webp               create WebP and exit
  -f, --force          force create AVIF and WebP
  -l, --lossless       perform lossless optimizations
  -v, --verbose        be verbose
  -c, --config <path>  use this configuration, overriding default config options
                       if present
  -o, --output <path>  write output to directory
  -p, --prefix <text>  add prefix to optimized file names
  -s, --suffix <text>  add suffix to optimized file names
  -V, --version        output the version number
  -h, --help           display help for command
`;

		test('Should be printed', () => {
			const stdout = runCliWithParameters('--help');
			expect(stdout).toBe(helpString);
		});

		test('Should be printed if no CLI params provided', () => {
			const stdout = runCliWithParameters('');
			expect(stdout).toBe(helpString);
		});
	});
});

function copyRecursive(from, to) {
	if (!fs.existsSync(to)) {
		fs.mkdirSync(to);
	}

	for (const item of fs.readdirSync(from, { withFileTypes: true })) {
		const fromPath = path.join(from, item.name);
		const toPath = path.join(to, item.name);

		if (item.isDirectory()) {
			copyRecursive(fromPath, toPath);
		} else {
			fs.copyFileSync(fromPath, toPath);
		}
	}
}

function calculateDirectorySize(directoryPath) {
	let totalSize = 0;

	for (const item of fs.readdirSync(directoryPath, { withFileTypes: true })) {
		const itemPath = path.join(directoryPath, item.name);

		if (item.isDirectory()) {
			calculateDirectorySize(itemPath);
			continue;
		}

		totalSize += fs.statSync(itemPath).size;
	}

	return totalSize;
}

function runCliWithParameters(parameters) {
	return execSync(`node "${cliPath}" ${parameters}`).toString();
}

function grepTotalRatio(string) {
	const [, ratio] = /You\ssaved\s.+\((\d{1,3})%\)/.exec(string);
	return Number.parseInt(ratio, 10);
}

function expectStringContains(string, containing) {
	expect(string).toEqual(expect.stringContaining(containing));
}

function expectStringNotContains(string, containing) {
	expect(string).toEqual(expect.not.stringContaining(containing));
}

function expectRatio(current, min, max) {
	expect(current).toBeGreaterThanOrEqual(min);
	expect(current).toBeLessThanOrEqual(max);
}

function expectFileRatio({ file, maxRatio, minRatio, stdout, outputExt }) {
	const fileBasename = path.basename(file, path.extname(file));
	const outputFile = outputExt ? `${fileBasename}.${outputExt}` : file;

	const sizeBefore = fs.statSync(path.join(images, file)).size;
	const sizeAfter = fs.statSync(path.join(temporary, outputFile)).size;

	const calculatedRatio = calculateRatio(sizeBefore, sizeAfter);
	const stdoutRatio = grepTotalRatio(stdout);

	expectStringContains(stdout, path.join(temporary, outputFile));
	expect(stdoutRatio).toBe(calculatedRatio);
	expectRatio(stdoutRatio, minRatio, maxRatio);
}

function expectTotalRatio({ maxRatio, minRatio, stdout }) {
	const sizeBefore = calculateDirectorySize(images);
	const sizeAfter = calculateDirectorySize(temporary);
	const calculatedRatio = calculateRatio(sizeBefore, sizeAfter);
	const stdoutRatio = grepTotalRatio(stdout);

	expect(stdoutRatio).toBe(calculatedRatio);
	expectRatio(stdoutRatio, minRatio, maxRatio);
}

function expectFileNotModified(fileName) {
	const origImageBuffer = fs.readFileSync(path.join(images, fileName));
	const temporaryImageBuffer = fs.readFileSync(path.join(temporary, fileName));

	expect(temporaryImageBuffer.equals(origImageBuffer)).toBe(true);
}

function expectFileExists(fileName) {
	const isFileExists = fs.existsSync(path.join(temporary, fileName));
	expect(isFileExists).toBe(true);
}

function expectFileNotExists(fileName) {
	const isFileExists = fs.existsSync(path.join(temporary, fileName));
	expect(isFileExists).toBe(false);
}
