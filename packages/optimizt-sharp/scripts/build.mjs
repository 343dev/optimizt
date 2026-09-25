import { createHash } from 'node:crypto';
import fs from 'node:fs/promises';
import https from 'node:https';
import path from 'node:path';
import { Readable } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import { fileURLToPath } from 'node:url';

import { x as extractTar } from 'tar';

const packageDirectory = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const packageJson = JSON.parse(await fs.readFile(path.join(packageDirectory, 'package.json'), 'utf8'));
const { integrity, package: upstreamName, tarball, version: upstreamVersion } = packageJson.optimiztSharp.upstream;

assertPinnedUpstream();

const archive = await download(tarball);
verifyIntegrity(archive, integrity);

const temporaryRoot = await fs.realpath(process.env.RUNNER_TEMP || process.env.TMPDIR || '/tmp');
const temporaryDirectory = await fs.mkdtemp(path.join(temporaryRoot, 'optimizt-sharp-'));
try {
	await pipeline(Readable.from(archive), extractTar({ cwd: temporaryDirectory, strip: 1 }));

	const upstreamPackage = JSON.parse(await fs.readFile(path.join(temporaryDirectory, 'package.json'), 'utf8'));
	if (upstreamPackage.name !== upstreamName || upstreamPackage.version !== upstreamVersion) {
		throw new Error(`Expected ${upstreamName}@${upstreamVersion}, received ${upstreamPackage.name}@${upstreamPackage.version}`);
	}

	const destinationDirectory = path.join(packageDirectory, 'dist');
	await fs.rm(destinationDirectory, { force: true, recursive: true });
	await fs.cp(path.join(temporaryDirectory, 'dist'), destinationDirectory, { recursive: true });
	await Promise.all([
		writeLoader(path.join(destinationDirectory, 'sharp.cjs'), 'commonjs'),
		writeLoader(path.join(destinationDirectory, 'sharp.mjs'), 'module'),
	]);
} finally {
	await fs.rm(temporaryDirectory, { force: true, recursive: true });
}

async function writeLoader(filePath, format) {
	const banner = `/*\n * Derived from sharp ${upstreamVersion}.\n * Copyright 2013 Lovell Fuller and others. SPDX-License-Identifier: Apache-2.0.\n */\n`;
	const source = format === 'module'
		? `${banner}import { createRequire } from 'node:module';\n\nconst require = createRequire(import.meta.url);\nconst sharp = require('@img/sharp-wasm32/sharp.node');\n\nexport default sharp;\n`
		: `${banner}module.exports = require('@img/sharp-wasm32/sharp.node');\n`;
	await fs.writeFile(filePath, source);
}

function assertPinnedUpstream() {
	const upstreamFields = Object.entries({ integrity, upstreamName, tarball, upstreamVersion });
	for (const [key, value] of upstreamFields) {
		if (typeof value !== 'string' || value.length === 0) throw new Error(`Missing pinned upstream ${key}`);
	}
	if (!tarball.endsWith(`/${upstreamName}-${upstreamVersion}.tgz`)) {
		throw new Error('Upstream tarball does not match the pinned package and version');
	}
}

function verifyIntegrity(buffer, expectedIntegrity) {
	const separator = expectedIntegrity.indexOf('-');
	const algorithm = expectedIntegrity.slice(0, separator);
	const expectedDigest = expectedIntegrity.slice(separator + 1);
	const actualDigest = createHash(algorithm).update(buffer).digest('base64');
	if (actualDigest !== expectedDigest) throw new Error(`Upstream integrity mismatch: expected ${expectedIntegrity}`);
}

function download(url) {
	return new Promise((resolve, reject) => {
		https.get(url, (response) => {
			if (response.statusCode !== 200) {
				response.resume();
				reject(new Error(`Unable to download upstream tarball: HTTP ${response.statusCode}`));
				return;
			}
			const chunks = [];
			response.on('data', (chunk) => {
				chunks.push(chunk);
			});
			response.on('end', () => resolve(Buffer.concat(chunks)));
			response.on('error', reject);
		}).on('error', reject);
	});
}
