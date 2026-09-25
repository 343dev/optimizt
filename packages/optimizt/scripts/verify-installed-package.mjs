import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const tarball = path.resolve(process.argv[2] || '');
if (!process.argv[2]) throw new Error('Usage: node scripts/verify-installed-package.mjs <tarball>');
const packageDirectory = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const temporary = await fs.mkdtemp(path.join(os.tmpdir(), 'optimizt-install-'));
try {
	await fs.writeFile(path.join(temporary, 'package.json'), '{"private":true}');
	const npmConfig = path.join(temporary, 'clean-install.npmrc');
	await fs.writeFile(npmConfig, 'ignore-scripts=true\n');
	run('npm', ['install', '--userconfig', npmConfig, tarball], temporary, { cleanNpmEnvironment: true });
	const executable = path.join(temporary, 'node_modules', '.bin', process.platform === 'win32' ? 'optimizt.cmd' : 'optimizt');
	run(executable, ['--help'], temporary);
	run(executable, ['--version'], temporary);
	for (const [fixture, arguments_] of [
		['png-not-optimized.png', []],
		['png-not-optimized.png', ['--webp']],
		['gif-not-optimized.gif', []],
		['jpeg-one-pixel.jpg', ['--lossless']],
	]) {
		const input = path.join(temporary, `${arguments_.join('-') || 'optimize'}-${fixture}`);
		await fs.copyFile(path.join(packageDirectory, 'tests/images', fixture), input);
		run(executable, [...arguments_, input], temporary);
	}
} finally {
	await fs.rm(temporary, { force: true, recursive: true });
}

function run(command, arguments_, cwd, { cleanNpmEnvironment = false } = {}) {
	const environment = { ...process.env };
	if (cleanNpmEnvironment) {
		for (const name of Object.keys(environment)) {
			if (name.toLowerCase() === 'npm_config_allow_scripts') delete environment[name];
		}
	}
	const result = spawnSync(command, arguments_, { cwd, encoding: 'utf8', env: environment });
	if (result.status !== 0) throw new Error(`${command} ${arguments_.join(' ')} failed:\n${result.stderr}`);
}
