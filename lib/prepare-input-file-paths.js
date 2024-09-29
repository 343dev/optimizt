import fs from 'node:fs';
import path from 'node:path';

import { fdir } from 'fdir';

export async function prepareInputFilePaths(paths, extensions) {
	const files = new Set();
	const directories = new Set();

	const pathsSet = new Set(paths);

	for (const currentPath of pathsSet) {
		try {
			const stat = await fs.promises.stat(currentPath); // eslint-disable-line no-await-in-loop

			if (stat.isDirectory()) {
				directories.add(currentPath);
			} else if (stat.isFile() && checkFileType(currentPath, extensions)) {
				files.add(getRelativePath(currentPath));
			}
		} catch {
			continue;
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
