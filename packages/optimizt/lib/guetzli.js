import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const nodeExecutable = process.execPath;
export const guetzliRunner = path.resolve(
	path.dirname(fileURLToPath(import.meta.url)),
	'../vendor/guetzli/cli.js',
);
