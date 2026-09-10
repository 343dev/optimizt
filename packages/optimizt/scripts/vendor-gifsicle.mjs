import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const packageDirectory = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const workspaceDirectory = path.resolve(packageDirectory, '..', 'optimizt-gifsicle');
const gifsicleDistributionDirectory = path.join(workspaceDirectory, 'dist');
const destinationDirectory = path.join(packageDirectory, 'vendor', 'gifsicle');

try {
	await fs.access(gifsicleDistributionDirectory);
} catch {
	throw new Error(`Missing ${gifsicleDistributionDirectory}. Build the WebAssembly runtime in packages/optimizt-gifsicle before vendoring.`);
}

await fs.rm(destinationDirectory, { force: true, recursive: true });
await fs.mkdir(destinationDirectory, { recursive: true });
await Promise.all([
	fs.cp(gifsicleDistributionDirectory, path.join(destinationDirectory, 'dist'), { recursive: true }),
	fs.cp(path.join(workspaceDirectory, 'lib'), path.join(destinationDirectory, 'lib'), { recursive: true }),
	fs.copyFile(path.join(workspaceDirectory, 'index.js'), path.join(destinationDirectory, 'index.js')),
	fs.copyFile(path.join(workspaceDirectory, 'LICENSE'), path.join(destinationDirectory, 'LICENSE')),
	fs.copyFile(path.join(workspaceDirectory, 'THIRD_PARTY_NOTICES.md'), path.join(destinationDirectory, 'THIRD_PARTY_NOTICES.md')),
	fs.copyFile(path.join(workspaceDirectory, 'UPSTREAM.md'), path.join(destinationDirectory, 'UPSTREAM.md')),
]);
