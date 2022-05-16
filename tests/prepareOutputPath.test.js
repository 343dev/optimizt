import path from 'node:path';
import { fileURLToPath } from 'node:url';

// eslint-disable-next-line import/no-extraneous-dependencies
import { jest } from '@jest/globals';

import prepareOutputPath from '../lib/prepareOutputPath.js';

const dirname = path.dirname(fileURLToPath(import.meta.url));

test('Exit if the path does not exist', () => {
  const processExitMock = jest.spyOn(process, 'exit').mockImplementation(exitCode => {
    throw new Error(`Process exit with status code: ${exitCode}`);
  });

  console.log = jest.fn();

  expect(() => prepareOutputPath('not+exists')).toThrow();
  expect(processExitMock).toHaveBeenCalledWith(1);
  expect(console.log.mock.calls[0][1]).toBe('Output path does not exist');

  console.log.mockRestore();
  processExitMock.mockRestore();
});

test('Exit if specified path to file instead of directory', () => {
  const processExitMock = jest.spyOn(process, 'exit').mockImplementation(exitCode => {
    throw new Error(`Process exit with status code: ${exitCode}`);
  });

  console.log = jest.fn();

  expect(() => prepareOutputPath(path.resolve(dirname, 'images', 'svg-not-optimized.svg'))).toThrow();
  expect(processExitMock).toHaveBeenCalledWith(1);
  expect(console.log.mock.calls[0][1]).toBe('Output path must be a directory');

  console.log.mockRestore();
  processExitMock.mockRestore();
});

test('Full path is generated', () => {
  expect(prepareOutputPath('tests/images')).toBe(path.resolve(dirname, 'images'));
});
