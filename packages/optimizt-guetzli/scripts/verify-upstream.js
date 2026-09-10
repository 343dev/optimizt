import { createHash } from 'node:crypto';
import { readFile, readdir } from 'node:fs/promises';
import path from 'node:path';

const root = new URL('../', import.meta.url);
const upstreamRoot = new URL('../upstream/guetzli/', import.meta.url);
const manifestUrl = new URL('../upstream/guetzli.sha256', import.meta.url);

async function listFiles(directory, prefix = '') {
	const entries = await readdir(directory, { withFileTypes: true });
	const files = [];
	for (const entry of entries) {
		const relative = path.posix.join(prefix, entry.name);
		if (entry.isDirectory()) {
			files.push(...await listFiles(new URL(`${relative}/`, upstreamRoot), relative));
		} else if (entry.isFile()) {
			files.push(relative);
		} else {
			throw new Error(`Unexpected non-file in upstream snapshot: ${relative}`);
		}
	}
	return files;
}

const manifest = await readFile(manifestUrl, 'utf8');
const expected = new Map();
for (const line of manifest.trimEnd().split('\n')) {
	const match = /^(?<hash>[0-9a-f]{64}) {2}\.\/(?<file>.+)$/.exec(line);
	if (!match) {
		throw new Error(`Malformed upstream manifest line: ${line}`);
	}
	expected.set(match.groups.file, match.groups.hash);
}

const discoveredFiles = await listFiles(upstreamRoot);
const files = discoveredFiles.toSorted();
if (files.join('\n') !== [...expected.keys()].join('\n')) {
	throw new Error('Upstream snapshot file list differs from upstream/guetzli.sha256');
}

for (const file of files) {
	const bytes = await readFile(new URL(`upstream/guetzli/${file}`, root));
	const actual = createHash('sha256').update(bytes).digest('hex');
	if (actual !== expected.get(file)) {
		throw new Error(`Upstream hash mismatch: ${file}`);
	}
}

console.log(`Verified ${files.length} upstream Guetzli files.`);
