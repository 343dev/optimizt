import { access } from 'node:fs/promises';

export default async function checkFileExists(filePath) {
	try {
		await access(filePath);
		return true;
	} catch {
		return false;
	}
}
