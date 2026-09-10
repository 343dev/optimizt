import { createHash } from 'node:crypto';
import { readFile, readdir, stat } from 'node:fs/promises';
import path from 'node:path';

const upstreamRoot = new URL('../upstream/gifsicle/', import.meta.url);
const hashManifestUrl = new URL('../upstream/gifsicle.sha256', import.meta.url);
const modeManifestUrl = new URL('../upstream/gifsicle.modes', import.meta.url);

async function listFiles(directory, prefix = '') {
	const entries = await readdir(directory, { withFileTypes: true });
	const files = [];
	for (const entry of entries) {
		const relative = path.posix.join(prefix, entry.name);
		if (entry.isDirectory()) {
			const child = new URL(`${encodeURIComponent(entry.name)}/`, directory);
			files.push(...await listFiles(child, relative));
		} else if (entry.isFile()) {
			files.push(relative);
		} else {
			throw new Error(`Unexpected non-file in upstream snapshot: ${relative}`);
		}
	}
	return files;
}

async function readManifest(url, pattern, label) {
	const manifest = await readFile(url, 'utf8');
	const values = new Map();
	for (const line of manifest.trimEnd().split(/\r?\n/)) {
		const match = pattern.exec(line);
		if (!match) {
			throw new Error(`Malformed ${label} manifest line: ${line}`);
		}
		if (values.has(match.groups.file)) {
			throw new Error(`Duplicate ${label} manifest file: ${match.groups.file}`);
		}
		values.set(match.groups.file, match.groups.value);
	}
	return values;
}

const expectedHashes = await readManifest(
	hashManifestUrl,
	/^(?<value>[0-9a-f]{64}) {2}(?:\.\/)?(?<file>.+)$/,
	'hash',
);
const expectedModes = await readManifest(
	modeManifestUrl,
	/^(?<value>644|755) (?<file>.+)$/,
	'mode',
);
const listedFiles = await listFiles(upstreamRoot);
const files = listedFiles.toSorted((first, second) => first.localeCompare(second));
const fileSet = new Set(files);
for (const manifest of [expectedHashes, expectedModes]) {
	const onDiskOnly = files.filter(file => !manifest.has(file));
	const manifestOnly = manifest.keys().filter(file => !fileSet.has(file)).toArray();
	if (onDiskOnly.length > 0 || manifestOnly.length > 0) {
		throw new Error(
			'Upstream snapshot file list differs from its manifest; '
			+ `only on disk: [${onDiskOnly.join(', ')}]; `
			+ `only in manifest: [${manifestOnly.join(', ')}]`,
		);
	}
}

for (const file of files) {
	const encodedPath = file.split('/').map(segment => encodeURIComponent(segment)).join('/');
	const url = new URL(encodedPath, upstreamRoot);
	const bytes = await readFile(url);
	const actualHash = createHash('sha256').update(bytes).digest('hex');
	if (actualHash !== expectedHashes.get(file)) {
		throw new Error(`Upstream hash mismatch: ${file}`);
	}
	if (process.platform !== 'win32') {
		const statistics = await stat(url);
		const actualMode = statistics.mode & 0o111 ? '755' : '644';
		if (actualMode !== expectedModes.get(file)) {
			throw new Error(`Upstream mode mismatch: ${file}`);
		}
	}
}

console.log(`Verified ${files.length} upstream Gifsicle files.`);
