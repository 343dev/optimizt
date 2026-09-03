import { afterEach, describe, expect, test, vi } from 'vitest';

import { isWindows } from './helpers/platform.js';

// Signal delivery is covered at the process level; these tests pin the resource rules
// the coordinator applies while a real signal is being handled.
const interruptStatus = { SIGINT: isWindows ? 1 : 130, SIGTERM: isWindows ? 1 : 143 };
const installedListeners = [];

afterEach(() => {
	for (const [signal, listener] of installedListeners) process.removeListener(signal, listener);
	installedListeners.length = 0;
	vi.restoreAllMocks();
});

// The coordinator owns module state, so every test works with a freshly loaded copy.
async function loadLifecycle() {
	vi.resetModules();
	const lifecycle = await import('../lib/lifecycle.js');
	const known = new Set(['SIGINT', 'SIGTERM'].flatMap(signal => process.listeners(signal)));

	lifecycle.installSignalHandlers(vi.fn());
	for (const signal of ['SIGINT', 'SIGTERM']) {
		for (const listener of process.listeners(signal)) {
			if (!known.has(listener)) installedListeners.push([signal, listener]);
		}
	}

	return lifecycle;
}

function createChildStub() {
	return { kill: vi.fn(), once: vi.fn() };
}

describe('shutdown coordinator', () => {
	test('nothing is interrupted and no status is forced without a signal', async () => {
		const lifecycle = await loadLifecycle();
		const child = createChildStub();
		lifecycle.registerChild(child);

		expect(lifecycle.isInterrupted()).toBe(false);
		expect(lifecycle.finishLifecycle()).toBeUndefined();
		expect(child.kill).not.toHaveBeenCalled();
	});

	test.each(['SIGINT', 'SIGTERM'])('%s terminates active external encoders and forces its status', async (signal) => {
		const lifecycle = await loadLifecycle();
		const child = createChildStub();
		lifecycle.registerChild(child);

		process.emit(signal);

		expect(child.kill).toHaveBeenCalledWith('SIGTERM');
		expect(lifecycle.isInterrupted()).toBe(true);
		expect(lifecycle.finishLifecycle()).toBe(interruptStatus[signal]);
	});

	test('an encoder started after the interrupt is terminated as soon as it is registered', async () => {
		const lifecycle = await loadLifecycle();

		process.emit('SIGINT');
		const lateChild = createChildStub();
		lifecycle.registerChild(lateChild);

		expect(lateChild.kill).toHaveBeenCalledWith('SIGTERM');
		expect(lifecycle.finishLifecycle()).toBe(interruptStatus.SIGINT);
	});
});
