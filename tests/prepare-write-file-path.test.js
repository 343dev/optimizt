import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import prepareWriteFilePath from '../lib/prepare-write-file-path.js';

const dirname = path.dirname(fileURLToPath(import.meta.url));

const imageName = 'jpeg-one-pixel.jpg';
const output = fs.mkdtempSync(path.join(os.tmpdir(), 'optimizt-test-'));

afterAll(() => {
  fs.rmSync(output, { recursive: true });
});

test('Write path does not change', () => {
  const filePath = path.resolve(dirname, 'images', imageName);

  expect(prepareWriteFilePath(filePath)).toBe(filePath);
});

test('Path changes when outputDir is specified', () => {
  const filePath = path.join('path', imageName);
  const outputFilePath = path.join(output, imageName);

  expect(prepareWriteFilePath(filePath, output)).toBe(outputFilePath);
});

test('Hierarchy is preserved', () => {
  const filePath = path.join('path', 'with', 'subdirs');
  const outputFilePath = path.join(output, 'with', 'subdirs');

  expect(prepareWriteFilePath(filePath, output)).toBe(outputFilePath);
  expect(prepareWriteFilePath(path.join(filePath, imageName), output)).toBe(path.join(outputFilePath, imageName));
});
