import os from 'node:os';

import { afterEach, describe, expect, test } from 'vitest';

import {
	copyFixture,
	fileSize,
	findTemporaryWriteLeftovers,
	isWindows,
	makeTemporaryDirectory,
	removeTemporaryDirectories,
	startCli,
} from './helpers/cli.js';

// Interruption must arrive while work is still queued, so the plan holds several times
// more operations than the runtime can process at once, and the signal is sent only
// after the first operation has reported a result.
const IMAGE_COUNT = os.cpus().length * 4;

afterEach(removeTemporaryDirectories);

async function startInterruptibleRun() {
	const directory = await makeTemporaryDirectory();
	const images = [];
	for (let index = 0; index < IMAGE_COUNT; index += 1) {
		images.push(await copyFixture(directory, 'png-not-optimized.png', `image-${index}.png`));
	}

	const run = startCli([directory]);
	await run.whenStderrIncludes('Ratio:');

	return { directory, images, run };
}

// POSIX statuses and signal delivery are Unix semantics; Windows offers no equivalent.
describe.skipIf(isWindows)('interruption', () => {
	test('SIGINT exits 130 within the bounded shutdown and leaves every image readable', async () => {
		const { directory, images, run } = await startInterruptibleRun();
		const sizesBefore = await Promise.all(images.map(image => fileSize(image)));

		run.child.kill('SIGINT');
		const interruptedAt = Date.now();
		const result = await run.finished;

		expect(result.code).toBe(130);
		expect(result.stdout).toBe('');
		expect(Date.now() - interruptedAt).toBeLessThan(5000);
		await expect(findTemporaryWriteLeftovers(directory)).resolves.toEqual([]);

		const sizesAfter = await Promise.all(images.map(image => fileSize(image)));
		for (const [index, size] of sizesAfter.entries()) {
			expect(size).toBeGreaterThan(0);
			expect(size).toBeLessThanOrEqual(sizesBefore[index]);
		}
	}, 30_000);

	test('SIGTERM exits 143', async () => {
		const { run } = await startInterruptibleRun();

		run.child.kill('SIGTERM');
		const result = await run.finished;

		expect(result.code).toBe(143);
	}, 30_000);

	test('a second interrupt exits immediately', async () => {
		const { run } = await startInterruptibleRun();

		run.child.kill('SIGINT');
		const startedAt = Date.now();
		await new Promise(resolve => setTimeout(resolve, 100));
		run.child.kill('SIGINT');
		const result = await run.finished;

		expect(result.code).toBe(130);
		// The bounded shutdown allows five seconds; the escape hatch must not wait for it.
		expect(Date.now() - startedAt).toBeLessThan(5000);
	}, 30_000);

	test('every operation is accounted for without being called skipped or failed', async () => {
		const { run } = await startInterruptibleRun();

		run.child.kill('SIGINT');
		const result = await run.finished;

		const summary = result.stderr.match(
			/(\d+) processed, (\d+) skipped, (\d+) failed(?:, (\d+) interrupted)?(?:, (\d+) not started)?/,
		);
		expect(summary).not.toBeNull();
		const [processed, skipped, failed, interrupted, unstarted] = summary.slice(1).map(part => Number(part ?? 0));
		expect(processed + skipped + failed + interrupted + unstarted).toBe(IMAGE_COUNT);
		expect(interrupted + unstarted).toBeGreaterThan(0);
		expect(failed).toBe(0);
	}, 30_000);
});
