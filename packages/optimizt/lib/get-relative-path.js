import path from 'node:path';

export function getRelativePath(filePath) {
	const replacePath = `${process.cwd()}${path.sep}`;

	return filePath.startsWith(replacePath)
		? filePath.slice(replacePath.length)
		: filePath;
}
