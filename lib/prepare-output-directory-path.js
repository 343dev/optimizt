import fs from 'node:fs/promises';
import path from 'node:path';

export async function prepareOutputDirectoryPath(outputDirectoryPath) {
	if (!outputDirectoryPath) return '';
	const resolvedPath = path.resolve(outputDirectoryPath);
	let stat;
	try {
		stat = await fs.stat(resolvedPath);
	} catch (error) {
		throw new Error(`Output path does not exist: ${resolvedPath}`, { cause: error });
	}
	if (!stat.isDirectory()) throw new Error(`Output path must be a directory: ${resolvedPath}`);
	return resolvedPath;
}
