import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { getRelativePath } from '../lib/get-relative-path.js';
import { prepareFilePaths } from '../lib/prepare-file-paths.js';

const dirname = path.dirname(fileURLToPath(import.meta.url));

const DEFAULT_IMAGE_PATH = resolvePath(['images']);
const DEFAULT_EXTENSIONS = ['gif', 'jpeg', 'jpg', 'png', 'svg'];

test('Non-existent file paths are ignored', async () => {
	const inputPaths = await generateInputPaths({
		inputPaths: [
			resolvePath(['not+exists']),
			resolvePath(['not+exists.svg']),
		],
	});

	expect(inputPaths).toStrictEqual([]);
});

test('Files from subdirectories are processed', async () => {
	const inputPaths = await generateInputPaths();

	expect(inputPaths).toEqual(
		expect.arrayContaining([
			expect.stringMatching(/file-in-subdirectory.jpg$/),
		]),
	);
});

test('Files are filtered by extension', async () => {
	const inputPaths = await generateInputPaths({ extensions: ['gif', 'jpeg', 'png', 'svg'] });

	expect(inputPaths).toEqual(
		expect.arrayContaining([
			expect.stringMatching(/\.gif$/),
			expect.stringMatching(/\.png$/),
			expect.stringMatching(/\.svg$/),
		]),
	);

	expect(inputPaths).not.toEqual(
		expect.arrayContaining([
			expect.stringMatching(/\.jpg$/),
		]),
	);
});

test('Only relative file paths are generated', async () => {
	const inputPaths = await generateInputPaths();

	expect(inputPaths).not.toEqual(
		expect.arrayContaining([
			expect.stringMatching(new RegExp(`^${dirname}`)),
		]),
	);
});

function resolvePath(segments) {
	return path.resolve(dirname, ...segments);
}

async function generateInputPaths({ inputPaths = [DEFAULT_IMAGE_PATH], extensions = DEFAULT_EXTENSIONS } = {}) {
	const result = await prepareFilePaths({ inputPaths, extensions });
	return result.map(item => getRelativePath(item.input));
}
