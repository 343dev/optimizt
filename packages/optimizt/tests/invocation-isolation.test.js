import { afterEach, expect, test, vi } from 'vitest';

import optimizt from '../index.js';
import { createLifecycle } from '../lib/lifecycle.js';
import { copyFixture, makeTemporaryDirectory, removeTemporaryDirectories } from './helpers/cli.js';

afterEach(() => {
	vi.restoreAllMocks();
	return removeTemporaryDirectories();
});

const baseOptions = Object.freeze({
	filePrefix: '', fileSuffix: '', isForced: false, isLossless: false, isVerbose: false,
	shouldConvertToAvif: false, shouldConvertToWebp: false, shouldUseColor: true,
});

test('independent application invocations do not share options or lifecycle state', async () => {
	const directory = await makeTemporaryDirectory();
	const first = await copyFixture(directory, 'png-not-optimized.png', 'first.png');
	const second = await copyFixture(directory, 'png-not-optimized.png', 'second.png');
	const originalNoColor = process.env.NO_COLOR;
	const stderrWrite = vi.spyOn(process.stderr, 'write').mockImplementation(() => true);
	const interruptedLifecycle = createLifecycle();
	interruptedLifecycle.interrupt('SIGINT');
	const freshLifecycle = createLifecycle();

	const interrupted = await optimizt({ inputPaths: [first], lifecycle: interruptedLifecycle, options: baseOptions });
	const completed = await optimizt({
		inputPaths: [second], lifecycle: freshLifecycle,
		options: Object.freeze({ ...baseOptions, isVerbose: true, shouldUseColor: false }),
	});

	expect(interrupted.interrupted).toBe(true);
	expect(interrupted.completed).toBe(0);
	expect(completed.interrupted).toBe(false);
	expect(completed.completed).toBe(1);
	expect(process.env.NO_COLOR).toBe(originalNoColor);
	expect(stderrWrite).toHaveBeenCalled();
	interruptedLifecycle.finish();
});
