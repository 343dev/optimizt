import fs from 'node:fs';
import path from 'node:path';

import fg from 'fast-glob';

export default function prepareFilePaths(paths, extensions) {
	const fgExtensions = extensions.join('|');
	const replacePath = `${process.cwd()}${path.sep}`;
	// eslint-disable-next-line unicorn/no-array-reduce
	const filePaths = [...new Set(paths.reduce((accumulator, filePath) => {
		if (fs.existsSync(filePath)) {
			// Search for files recursively inside the dir
			if (fs.lstatSync(filePath).isDirectory()) {
				accumulator = [
					...accumulator,
					...fg.sync(
						`${path.resolve(filePath).replaceAll('\\', '/')}/**/*.+(${fgExtensions})`,
						{ caseSensitiveMatch: false },
					),
				];
			}

			// Filter files by extension
			if (extensions.includes(path.extname(filePath).toLowerCase().slice(1))) {
				accumulator.push(filePath);
			}
		}

		return accumulator;
	}, []))];

	// Use relative paths when it's possible
	return filePaths.map(p => p.replace(replacePath, ''));
}
