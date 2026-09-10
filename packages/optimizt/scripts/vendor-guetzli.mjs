import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const packageDirectory = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const workspaceDirectory = path.resolve(packageDirectory, '..', 'optimizt-guetzli');
const destinationDirectory = path.join(packageDirectory, 'vendor', 'guetzli');

await fs.rm(destinationDirectory, { force: true, recursive: true });
await fs.mkdir(destinationDirectory, { recursive: true });
await Promise.all([
	fs.cp(path.join(workspaceDirectory, 'dist'), path.join(destinationDirectory, 'dist'), { recursive: true }),
	fs.copyFile(path.join(workspaceDirectory, 'cli.js'), path.join(destinationDirectory, 'cli.js')),
	fs.copyFile(path.join(workspaceDirectory, 'LICENSE'), path.join(destinationDirectory, 'LICENSE')),
	fs.copyFile(path.join(workspaceDirectory, 'THIRD_PARTY_NOTICES.md'), path.join(destinationDirectory, 'THIRD_PARTY_NOTICES.md')),
	fs.copyFile(path.join(workspaceDirectory, 'UPSTREAM.md'), path.join(destinationDirectory, 'UPSTREAM.md')),
]);
