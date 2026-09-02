import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

import { expect, test } from 'vitest';

import { prepareOutputDirectoryPath } from '../lib/prepare-output-directory-path.js';

test('returns an existing directory as an absolute path', async () => {
	await expect(prepareOutputDirectoryPath('.')).resolves.toBe(path.resolve('.'));
});

test('rejects a missing output root', async () => {
	const missing = path.join(os.tmpdir(), 'definitely-missing-optimizt');
	const result = prepareOutputDirectoryPath(missing);
	await expect(result).rejects.toThrow('does not exist');
});

test('rejects a file as an output root', async () => {
	const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'optimizt-output-'));
	const file = path.join(directory, 'file');
	await fs.writeFile(file, 'x');
	await expect(prepareOutputDirectoryPath(file)).rejects.toThrow('must be a directory');
	await fs.rm(directory, { recursive: true });
});
