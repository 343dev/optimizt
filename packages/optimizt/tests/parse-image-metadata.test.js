import { expect, test } from 'vitest';

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { parseImageMetadata } from '../lib/parse-image-metadata.js';

const dirname = path.dirname(fileURLToPath(import.meta.url));

function readFile(filePath) {
	return fs.readFileSync(path.resolve(dirname, filePath));
}

const gifBuffer = readFile('images/gif-not-optimized.gif');
const jpegBuffer = readFile('images/jpeg-one-pixel.jpg');
const pngBuffer = readFile('images/png-not-optimized.png');
const svgBuffer = readFile('images/svg-optimized.svg');

const gifMetadata = await parseImageMetadata(gifBuffer);
const jpegMetadata = await parseImageMetadata(jpegBuffer);
const pngMetadata = await parseImageMetadata(pngBuffer);
const svgMetadata = await parseImageMetadata(svgBuffer);

test('Format: GIF should be detected as “gif”', async () => {
	expect(gifMetadata.format).toBe('gif');
});

test('Format: JPEG should be detected as “jpeg”', async () => {
	expect(jpegMetadata.format).toBe('jpeg');
});

test('Format: PNG should be detected as “png”', async () => {
	expect(pngMetadata.format).toBe('png');
});

test('Format: SVG should be detected as “svg”', async () => {
	expect(svgMetadata.format).toBe('svg');
});

test('Pages: Frames count should be detected in animated GIF', async () => {
	expect(gifMetadata.pages).toBe(10);
});
