import { execFileSync } from 'node:child_process';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const packageDirectory = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const repoDirectory = path.resolve(packageDirectory, '..', '..');
const workspaceDirectory = path.resolve(packageDirectory, '..', 'optimizt-gifsicle');
const gifsicleDistributionDirectory = path.join(workspaceDirectory, 'dist');
const destinationDirectory = path.join(packageDirectory, 'vendor', 'gifsicle');
for (const artifact of ['gifsicle.mjs', 'gifsicle.wasm']) {
	try {
		await fs.access(path.join(gifsicleDistributionDirectory, artifact));
	} catch {
		throw new Error(`Missing Gifsicle WebAssembly artifact: ${path.join(gifsicleDistributionDirectory, artifact)}. Build packages/optimizt-gifsicle before vendoring.`);
	}
}

const sourceRevision = git(['rev-parse', 'HEAD']);
if (!/^[0-9a-f]{40}$/.test(sourceRevision)) {
	throw new Error(`Expected a full Git commit SHA, received: ${sourceRevision}`);
}

const sourcePath = 'packages/optimizt-gifsicle';
const isDevelopmentBuild = process.env.OPTIMIZT_SKIP_GIFSICLE_SOURCE_CHECK === '1';
const sourceStatus = git([
	'status', '--porcelain=v1', '--untracked-files=all', '--', sourcePath,
]);
if (sourceStatus && !isDevelopmentBuild) {
	throw new Error([
		'Cannot vendor the publishable Gifsicle runtime from modified source/build files.',
		'Commit or discard all changes under packages/optimizt-gifsicle so SOURCE.md identifies the exact source used for the WebAssembly build.',
		'',
		sourceStatus,
	].join('\n'));
}
await fs.rm(destinationDirectory, { force: true, recursive: true });
await fs.mkdir(destinationDirectory, { recursive: true });
await Promise.all([
	fs.cp(gifsicleDistributionDirectory, path.join(destinationDirectory, 'dist'), { recursive: true }),
	fs.cp(path.join(workspaceDirectory, 'lib'), path.join(destinationDirectory, 'lib'), { recursive: true }),
	fs.copyFile(path.join(workspaceDirectory, 'index.js'), path.join(destinationDirectory, 'index.js')),
	fs.copyFile(path.join(workspaceDirectory, 'LICENSE'), path.join(destinationDirectory, 'LICENSE')),
	fs.copyFile(path.join(workspaceDirectory, 'GIFSICLE-LICENSE.md'), path.join(destinationDirectory, 'GIFSICLE-LICENSE.md')),
	fs.copyFile(path.join(workspaceDirectory, 'MUSL-COPYRIGHT'), path.join(destinationDirectory, 'MUSL-COPYRIGHT')),
	fs.copyFile(path.join(workspaceDirectory, 'THIRD_PARTY_NOTICES.md'), path.join(destinationDirectory, 'THIRD_PARTY_NOTICES.md')),
]);
await fs.writeFile(path.join(destinationDirectory, 'SOURCE.md'), sourceDocument(sourceRevision));

function git(arguments_) {
	try {
		return execFileSync('git', ['-C', repoDirectory, ...arguments_], {
			encoding: 'utf8',
		}).trim();
	} catch (error) {
		throw new Error(`Unable to determine Gifsicle source provenance with Git: ${error.message}`, { cause: error });
	}
}

function sourceDocument(revision) {
	if (isDevelopmentBuild && sourceStatus) {
		return `# Development build\n\nThis vendored runtime was produced from uncommitted local source and must not be published.\n`;
	}
	const repoUrl = `https://github.com/343dev/optimizt/tree/${revision}/${sourcePath}`;
	const archiveUrl = `https://github.com/343dev/optimizt/archive/${revision}.tar.gz`;
	return `# Corresponding source for Gifsicle WebAssembly

The bundled Gifsicle WebAssembly runtime was built from the exact Optimizt
repository revision \`${revision}\`.

- Complete corresponding source: <${repoUrl}>
- Source archive for the same immutable revision: <${archiveUrl}>
- Upstream Gifsicle project: <https://github.com/kohler/gifsicle>

The Optimizt source directory at that revision contains the pristine upstream
Gifsicle source, the Optimizt modifications and patch, the WebAssembly bridge,
the build scripts, the pinned Emscripten version and build configuration, and
the other files needed to reproduce the corresponding WebAssembly build.
`;
}
