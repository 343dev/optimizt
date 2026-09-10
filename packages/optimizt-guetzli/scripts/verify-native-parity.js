import { spawn } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

import manifest from '../test/parity-manifest.json' with { type: 'json' };

const binary = process.env.GUETZLI_NATIVE_REFERENCE;
if (!binary) {
	throw new Error('GUETZLI_NATIVE_REFERENCE must point to the native reference binary');
}

function sha256(value) {
	return createHash('sha256').update(value).digest('hex');
}

async function encode(inputPath, quality, outputPath) {
	await new Promise((resolve, reject) => {
		const child = spawn(binary, [String(quality), inputPath, outputPath], {
			stdio: 'inherit',
		});
		child.once('error', reject);
		child.once('exit', (code, signal) => {
			if (code === 0) {
				resolve();
				return;
			}
			reject(new Error(
				signal
					? `Native reference was terminated by ${signal}`
					: `Native reference exited with status ${code}`,
			));
		});
	});
}

const cases = Object.entries(manifest.cases ?? {});
if (cases.length === 0) {
	throw new Error('Parity manifest contains no cases to verify');
}

const directory = await mkdtemp(path.join(tmpdir(), 'guetzli-native-parity-'));
try {
	// Keep encodings serial: each Guetzli process can consume hundreds of MiB.
	for (const [fixture, qualities] of cases) {
		const inputPath = fileURLToPath(new URL(`../test/fixtures/${fixture}`, import.meta.url));
		for (const [qualityText, expectation] of Object.entries(qualities)) {
			const outputPath = path.join(directory, `${fixture}-${qualityText}.jpg`);
			await encode(inputPath, Number(qualityText), outputPath);
			const output = await readFile(outputPath);
			const actualSha256 = sha256(output);
			if (output.byteLength !== expectation.size || actualSha256 !== expectation.sha256) {
				throw new Error(
					`Native parity mismatch for ${fixture} at quality ${qualityText}: `
					+ `expected size ${expectation.size}, sha256 ${expectation.sha256}; `
					+ `actual size ${output.byteLength}, sha256 ${actualSha256}`,
				);
			}
		}
	}
} finally {
	await rm(directory, { recursive: true, force: true });
}

process.stdout.write('Verified native parity baselines.\n');
