import { access } from 'node:fs/promises';

export async function checkPathAccessibility(filePath) {
	try {
		await access(filePath);
		return true;
	} catch {
		return false;
	}
}
