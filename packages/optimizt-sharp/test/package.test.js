import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, test } from 'vitest';

import sharp from '../dist/index.mjs';

const packageDirectory = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const fixturePath = path.resolve(packageDirectory, '..', 'optimizt', 'tests', 'images', 'jpeg-low-quality.jpg');

describe('@343dev/optimizt-sharp', () => {
	test('uses the WebAssembly backend', () => {
		expect(sharp.versions.emscripten).toBeTypeOf('string');
	});

	test.each(['jpeg', 'png', 'webp', 'avif'])('encodes %s', async (format) => {
		const input = await fs.readFile(fixturePath);
		const output = await sharp(input).rotate()[format]().toBuffer();
		const metadata = await sharp(output).metadata();

		expect(output.length).toBeGreaterThan(0);
		expect(metadata.format).toBe(format === 'avif' ? 'heif' : format);
	});

	test('keeps runtime packages compatible with the published Optimizt package', async () => {
		const packageJson = JSON.parse(await fs.readFile(path.join(packageDirectory, 'package.json'), 'utf8'));
		const optimiztPackage = JSON.parse(await fs.readFile(path.join(packageDirectory, '..', 'optimizt', 'package.json'), 'utf8'));
		const dependencies = Object.keys(packageJson.dependencies ?? {});

		expect(packageJson.private).toBe(true);
		expect(packageJson.optionalDependencies).toBeUndefined();
		expect(dependencies).toContain('@img/sharp-wasm32');
		expect(dependencies.filter(name => /^@img\/sharp-(?!wasm32$)/.test(name))).toEqual([]);
		for (const dependency of dependencies) {
			expect(optimiztPackage.dependencies[dependency]).toBe(packageJson.dependencies[dependency]);
		}
	});

	test('rebuilds byte-for-byte from the pinned upstream tarball', async () => {
		const before = await snapshotDistribution();
		const { spawn } = await import('node:child_process');
		const child = spawn(process.execPath, ['scripts/build.mjs'], { cwd: packageDirectory, stdio: 'inherit' });
		await new Promise((resolve, reject) => {
			child.once('error', reject);
			child.once('close', code => code === 0 ? resolve() : reject(new Error(`Build exited with ${code}`)));
		});
		expect(await snapshotDistribution()).toEqual(before);
	});
});

async function snapshotDistribution() {
	const directory = path.join(packageDirectory, 'dist');
	const entries = await fs.readdir(directory);
	const names = entries.toSorted((left, right) => left.localeCompare(right));
	return Promise.all(names.map(async name => [name, await fs.readFile(path.join(directory, name), 'base64')]));
}
