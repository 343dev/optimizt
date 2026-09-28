import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const tarball = process.argv[2];
if (!tarball) throw new Error('Usage: node scripts/verify-package.mjs <tarball>');
const packageDirectory = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const temporary = await fs.mkdtemp(path.join(os.tmpdir(), 'optimizt-package-'));
try {
	const listing = spawnSync('tar', ['-tzf', tarball], { encoding: 'utf8' });
	if (listing.status !== 0) throw new Error(listing.stderr);
	const paths = new Set(listing.stdout.trim().split('\n'));
	const required = [
		'package/cli.js', 'package/THIRD_PARTY_NOTICES.md',
		'package/vendor/sharp/dist/index.mjs',
		'package/vendor/sharp/LICENSE', 'package/vendor/sharp/NOTICE',
		'package/vendor/guetzli/dist/guetzli.wasm', 'package/vendor/guetzli/LICENSE',
		'package/vendor/guetzli/MUSL-COPYRIGHT',
		'package/vendor/guetzli/THIRD_PARTY_NOTICES.md', 'package/vendor/guetzli/UPSTREAM.md',
		'package/vendor/gifsicle/dist/gifsicle.wasm',
		'package/vendor/gifsicle/dist/gifsicle.mjs',
		'package/vendor/gifsicle/index.js',
		'package/vendor/gifsicle/lib/errors.js',
		'package/vendor/gifsicle/lib/optimize.js',
		'package/vendor/gifsicle/lib/options.js',
		'package/vendor/gifsicle/lib/worker.js',
		'package/vendor/gifsicle/LICENSE',
		'package/vendor/gifsicle/GIFSICLE-LICENSE.md',
		'package/vendor/gifsicle/MUSL-COPYRIGHT',
		'package/vendor/gifsicle/THIRD_PARTY_NOTICES.md',
		'package/vendor/gifsicle/SOURCE.md',
	];
	for (const requiredPath of required) assert.ok(paths.has(requiredPath), `Missing package path: ${requiredPath}`);

	const forbiddenPrefixes = [
		'package/vendor/gifsicle/upstream/',
		'package/vendor/gifsicle/src/',
		'package/vendor/gifsicle/scripts/',
		'package/vendor/gifsicle/verification/',
	];
	for (const packagePath of paths) {
		assert.ok(
			forbiddenPrefixes.every(prefix => !packagePath.startsWith(prefix)),
			`Forbidden Gifsicle source/build path in package: ${packagePath}`,
		);
	}

	const extract = spawnSync('tar', ['-xzf', tarball, '-C', temporary]);
	if (extract.status !== 0) throw new Error(extract.stderr.toString());
	const packageRoot = path.join(temporary, 'package');
	const packageJson = JSON.parse(await fs.readFile(path.join(packageRoot, 'package.json'), 'utf8'));
	assert.equal(packageJson.license, 'MIT', 'Published package license must be MIT');

	const packageNotice = await fs.readFile(path.join(packageRoot, 'THIRD_PARTY_NOTICES.md'), 'utf8');
	assert.match(
		packageNotice,
		/Gifsicle: the bundled runtime is distributed under the alternative license/,
		'Package notice must identify the selected Gifsicle alternative license',
	);

	const source = await fs.readFile(path.join(packageRoot, 'vendor/gifsicle/SOURCE.md'), 'utf8');
	const sourceMatch = source.match(/https:\/\/github\.com\/343dev\/optimizt\/tree\/([0-9a-f]{40})\/packages\/optimizt-gifsicle/);
	assert.ok(sourceMatch, 'Gifsicle SOURCE.md must link to a full immutable Optimizt commit SHA');
	assert.match(
		source,
		new RegExp(String.raw`https://github\.com/343dev/optimizt/archive/${sourceMatch[1]}\.tar\.gz`),
		'Gifsicle SOURCE.md must link to the source archive for the same commit SHA',
	);
	assert.match(source, /https:\/\/github\.com\/kohler\/gifsicle/, 'Gifsicle SOURCE.md must link to the upstream project');

	const notice = await fs.readFile(path.join(packageRoot, 'vendor/gifsicle/THIRD_PARTY_NOTICES.md'), 'utf8');
	assert.match(
		notice,
		/The bundled\s+Gifsicle in this Optimizt distribution is distributed under that alternative\s+license\./,
		'Gifsicle notice must identify the selected alternative license',
	);
	assert.match(notice, /Copyright \(C\) 1997-2025 Eddie Kohler\./, 'Gifsicle notice must retain its copyright notice');
	const license = await fs.readFile(path.join(packageRoot, 'vendor/gifsicle/GIFSICLE-LICENSE.md'));
	const canonicalLicense = await fs.readFile(path.join(packageDirectory, '..', 'optimizt-gifsicle', 'GIFSICLE-LICENSE.md'));
	assert.deepEqual(license, canonicalLicense, 'Package must retain the complete original Gifsicle licensing text');
	for (const requiredReference of ['`LICENSE`', '`GIFSICLE-LICENSE.md`', '`MUSL-COPYRIGHT`', '`SOURCE.md`']) {
		assert.ok(notice.includes(requiredReference), `Gifsicle notice must reference ${requiredReference}`);
	}
	const guetzliNotice = await fs.readFile(path.join(packageRoot, 'vendor/guetzli/THIRD_PARTY_NOTICES.md'), 'utf8');
	assert.ok(guetzliNotice.includes('`MUSL-COPYRIGHT`'), 'Guetzli notice must reference `MUSL-COPYRIGHT`');
} finally {
	await fs.rm(temporary, { force: true, recursive: true });
}
