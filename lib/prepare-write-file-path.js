import fs from 'node:fs';
import path from 'node:path';

export default function prepareWriteFilePath(filePath, output) {
	if (!output) {
		return filePath;
	}

	const replacePath = `${process.cwd()}${path.sep}`;
	const { base, dir } = path.parse(filePath);
	const [, ...subDirectories] = dir.split(path.sep);

	fs.mkdirSync(path.join(output, ...subDirectories), { recursive: true });

	return path.join(output, ...subDirectories, base).replace(replacePath, '');
}
