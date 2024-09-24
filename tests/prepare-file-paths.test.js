import path from 'node:path';
import { fileURLToPath } from 'node:url';

import prepareInputFilePaths from '../lib/prepare-input-file-paths.js';

const dirname = path.dirname(fileURLToPath(import.meta.url));

const DEFAULT_IMAGE_PATH = resolvePath(['images']);
const DEFAULT_EXTENSIONS = ['gif', 'jpeg', 'jpg', 'png', 'svg'];

test('Non-existent file paths are ignored', async () => {
	const paths = [
		resolvePath(['not+exists']),
		resolvePath(['not+exists.svg']),
	];
	expect(await prepareInputFilePaths(paths, DEFAULT_EXTENSIONS)).toStrictEqual([]);
});

test('Files from subdirectories are processed', async () => {
	expect(await prepareInputFilePaths([DEFAULT_IMAGE_PATH], DEFAULT_EXTENSIONS)).toEqual(
		expect.arrayContaining([
			expect.stringMatching(/file-in-subdirectory.jpg$/),
		]),
	);
});

test('Files are filtered by extension', async () => {
	const extensions = ['gif', 'jpeg', 'png', 'svg'];

	expect(await prepareInputFilePaths([DEFAULT_IMAGE_PATH], extensions)).toEqual(
		expect.arrayContaining([
			expect.stringMatching(/\.gif$/),
			expect.stringMatching(/\.png$/),
			expect.stringMatching(/\.svg$/),
		]),
	);

	expect(await prepareInputFilePaths([DEFAULT_IMAGE_PATH], extensions)).not.toEqual(
		expect.arrayContaining([
			expect.stringMatching(/\.jpg$/),
		]),
	);
});

test('Only relative file paths are generated', async () => {
	expect(await prepareInputFilePaths([DEFAULT_IMAGE_PATH], DEFAULT_EXTENSIONS)).not.toEqual(
		expect.arrayContaining([
			expect.stringMatching(new RegExp(`^${dirname}`)),
		]),
	);
});

function resolvePath(segments) {
	return path.resolve(dirname, ...segments);
}
