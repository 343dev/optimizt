import fs from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const policyPath = new URL('../release-distribution-policy.json', import.meta.url);
let policy;
try {
	policy = JSON.parse(await fs.readFile(policyPath, 'utf8'));
} catch {
	throw new Error('Publication is blocked: release-distribution-policy.json has not been supplied by maintainers after licensing review.');
}
const requiredComplianceFiles = [
	'packages/optimizt-gifsicle/GIFSICLE-LICENSE.md',
	'packages/optimizt-gifsicle/LICENSE',
	'packages/optimizt-gifsicle/MUSL-COPYRIGHT',
	'packages/optimizt-gifsicle/THIRD_PARTY_NOTICES.md',
	'packages/optimizt-guetzli/LICENSE',
	'packages/optimizt-guetzli/MUSL-COPYRIGHT',
	'packages/optimizt-guetzli/THIRD_PARTY_NOTICES.md',
	'packages/optimizt/THIRD_PARTY_NOTICES.md',
];
if (!policy.packageLicense || typeof policy.noticeSha256 !== 'object'
	|| requiredComplianceFiles.some(filePath => !policy.noticeSha256[filePath])) {
	throw new Error('Publication is blocked: the maintainer-approved release distribution policy is incomplete.');
}
const packageJson = JSON.parse(await fs.readFile(path.join(root, 'packages/optimizt/package.json'), 'utf8'));
if (packageJson.license !== policy.packageLicense) throw new Error('Publication is blocked: package license metadata differs from the approved policy.');
for (const [noticePath, approvedHash] of Object.entries(policy.noticeSha256)) {
	const contents = await fs.readFile(path.join(root, noticePath));
	const actualHash = createHash('sha256').update(contents).digest('hex');
	if (actualHash !== approvedHash) throw new Error(`Publication is blocked: ${noticePath} differs from its approved wording.`);
}
if (policy.approved !== true) {
	throw new Error('Publication is blocked: release distribution policy requires separate maintainer approval.');
}
