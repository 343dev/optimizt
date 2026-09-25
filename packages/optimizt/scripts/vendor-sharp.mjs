import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const packageDirectory = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const workspaceDirectory = path.resolve(packageDirectory, '..', 'optimizt-sharp');
const sharpDistributionDirectory = path.join(workspaceDirectory, 'dist');
const destinationDirectory = path.join(packageDirectory, 'vendor', 'sharp');

try {
	await fs.access(sharpDistributionDirectory);
} catch {
	throw new Error(`Missing ${sharpDistributionDirectory}. Run "node ../optimizt-sharp/scripts/build.mjs" before vendoring sharp.`);
}

await fs.rm(destinationDirectory, { force: true, recursive: true });
await fs.mkdir(destinationDirectory, { recursive: true });
await Promise.all([
	fs.cp(sharpDistributionDirectory, path.join(destinationDirectory, 'dist'), { recursive: true }),
	fs.copyFile(path.join(workspaceDirectory, 'LICENSE'), path.join(destinationDirectory, 'LICENSE')),
	fs.copyFile(path.join(workspaceDirectory, 'NOTICE'), path.join(destinationDirectory, 'NOTICE')),
	writePackageJson(),
]);

async function writePackageJson() {
	const workspacePackage = JSON.parse(await fs.readFile(path.join(workspaceDirectory, 'package.json'), 'utf8'));
	const optimiztPackage = JSON.parse(await fs.readFile(path.join(packageDirectory, 'package.json'), 'utf8'));
	for (const [name, version] of Object.entries(workspacePackage.dependencies)) {
		if (optimiztPackage.dependencies[name] !== version) {
			throw new Error(`Dependency "${name}@${version}" required by vendored sharp must be declared by @343dev/optimizt with the same version`);
		}
	}
	const vendorPackage = {
		name: '@343dev/optimizt-vendored-sharp',
		private: true,
		version: workspacePackage.version,
		type: 'module',
		config: workspacePackage.config,
	};
	await fs.writeFile(path.join(destinationDirectory, 'package.json'), `${JSON.stringify(vendorPackage, undefined, '\t')}\n`);
}
