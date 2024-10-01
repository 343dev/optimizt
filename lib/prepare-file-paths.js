import fs from 'node:fs';
import path from 'node:path';

import { fdir } from 'fdir';

export async function prepareFilePaths({
	inputPaths,
	outputDirectoryPath,
	extensions,
}) {
	const files = new Set();
	const directories = new Set();
	const inputPathsSet = new Set(inputPaths);

	await Promise.all(
		[...inputPathsSet].map(async currentPath => {
			try {
				const stat = await fs.promises.stat(currentPath);
				const resolvedPath = path.resolve(currentPath);

				if (stat.isDirectory()) {
					directories.add(resolvedPath);
				} else if (stat.isFile() && checkFileType(resolvedPath, extensions)) {
					files.add(resolvedPath);
				}
			} catch {}
		}),
	);

	const crawler = new fdir() // eslint-disable-line new-cap
		.withFullPaths()
		.withDirs()
		.filter(currentPath => checkFileType(currentPath, extensions));

	const crawledPaths = await Promise.all(
		[...directories].map(currentPath => crawler.crawl(currentPath).withPromise()),
	);

	for (const crawledPath of crawledPaths.flat()) {
		files.add(crawledPath);
	}

	const hasDirectories = directories.size > 0;

	const result = [...files].map(filePath => {
		let outputPath = filePath;

		if (outputDirectoryPath) {
			if (hasDirectories) {
				for (const directory of directories) {
					if (filePath.startsWith(directory)) {
						outputPath = path.join(outputDirectoryPath, filePath.slice(directory.length));
						break;
					}
				}
			} else {
				outputPath = path.join(outputDirectoryPath, filePath.slice(path.dirname(filePath).length));
			}
		}

		return {
			input: filePath,
			output: outputPath,
		};
	});

	return result;
}

function checkFileType(filePath, extensions) {
	const extension = path.extname(filePath).toLowerCase().slice(1);
	return extensions.includes(extension);
}
