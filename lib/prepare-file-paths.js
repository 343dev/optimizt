import fs from 'node:fs';
import path from 'node:path';

import { fdir } from 'fdir';

export default async function prepareFilePaths(paths, extensions) {
	const files = new Set();
	const directories = new Set();

	const pathsSet = new Set(paths);

	for (const currentPath of pathsSet) {
		if (!fs.existsSync(currentPath)) {
			continue;
		}

		const lstat = fs.lstatSync(currentPath);

		if (lstat.isDirectory()) {
			directories.add(currentPath);
		} else if (lstat.isFile() && checkFileType(currentPath, extensions)) {
			files.add(getRelativePath(currentPath));
		}
	}

	const crawler = new fdir() // eslint-disable-line new-cap
		.withFullPaths()
		.filter(currentPath => checkFileType(currentPath, extensions));

	const crawlerPromises = [...directories].map(currentPath => crawler.crawl(currentPath).withPromise());
	const crawledPaths = await Promise.all(crawlerPromises);

	for (const crawledPath of crawledPaths.flat()) {
		files.add(getRelativePath(crawledPath));
	}

	const filteredPaths = [...files];

	return filteredPaths;
}

function getRelativePath(filePath) {
	const replacePath = `${process.cwd()}${path.sep}`;

	return filePath.startsWith(replacePath)
		? filePath.slice(replacePath.length)
		: filePath;
}

function checkFileType(filePath, extensions) {
	const extension = path.extname(filePath).toLowerCase().slice(1);
	return extensions.includes(extension);
}
