import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, test } from 'vitest';

const packageDirectory = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

describe('published package', () => {
	test('vendors the generated sharp distribution', async () => {
		const packageJson = JSON.parse(await fs.readFile(path.join(packageDirectory, 'package.json'), 'utf8'));
		const vendorPackage = JSON.parse(await fs.readFile(path.join(packageDirectory, 'vendor', 'sharp', 'package.json'), 'utf8'));
		const vendorFiles = await fs.readdir(path.join(packageDirectory, 'vendor', 'sharp', 'dist'));

		expect(packageJson.files).toContain('vendor/');
		expect(packageJson.dependencies['@343dev/optimizt-sharp']).toBeUndefined();
		expect(packageJson.dependencies['@img/sharp-wasm32']).toBeTypeOf('string');
		expect(vendorPackage.private).toBe(true);
		expect(vendorFiles).toContain('index.mjs');
		expect(vendorFiles).toContain('sharp.mjs');
	});
});
