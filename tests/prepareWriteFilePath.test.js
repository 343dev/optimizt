import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import prepareWriteFilePath from '../lib/prepareWriteFilePath.js';

const dirname = path.dirname(fileURLToPath(import.meta.url));

const imageName = 'jpeg-one-pixel.jpg';
const outputDir = fs.mkdtempSync(path.join(os.tmpdir(), 'optimizt-test-'));

afterAll(() => {
  fs.rmdirSync(outputDir, { recursive: true });
});

test('Write path does not change', () => {
  const filePath = path.resolve(dirname, 'images', imageName);

  expect(prepareWriteFilePath(filePath)).toBe(filePath);
});

test('Path changes when outputDir is specified', () => {
  const filePath = path.join('path', imageName);
  const outputFilePath = path.join(outputDir, imageName);

  expect(prepareWriteFilePath(filePath, outputDir)).toBe(outputFilePath);
});

test('Hierarchy is preserved', () => {
  const filePath = path.join('path', 'with', 'subdirs');
  const outputFilePath = path.join(outputDir, 'with', 'subdirs');

  expect(prepareWriteFilePath(filePath, outputDir)).toBe(outputFilePath);
  expect(prepareWriteFilePath(path.join(filePath, imageName), outputDir)).toBe(path.join(outputFilePath, imageName));
});
