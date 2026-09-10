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

	lifecycle.installSignalHandlers();
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

function pendingPromise() {
	return new Promise(() => {});
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

	test('an interrupt cancels active in-process operations', async () => {
		const lifecycle = await loadLifecycle();
		const cancel = vi.fn();
		lifecycle.registerCancellable(cancel, pendingPromise());

		process.emit('SIGINT');

		expect(cancel).toHaveBeenCalledOnce();
		expect(lifecycle.finishLifecycle()).toBe(interruptStatus.SIGINT);
	});

	test('an operation registered after the interrupt is cancelled immediately', async () => {
		const lifecycle = await loadLifecycle();
		const cancel = vi.fn();

		process.emit('SIGTERM');
		lifecycle.registerCancellable(cancel, pendingPromise());

		expect(cancel).toHaveBeenCalledOnce();
		expect(lifecycle.finishLifecycle()).toBe(interruptStatus.SIGTERM);
	});

	test('a completed operation is no longer cancelled', async () => {
		const lifecycle = await loadLifecycle();
		const cancel = vi.fn();
		lifecycle.registerCancellable(cancel, Promise.resolve());
		await Promise.resolve();

		process.emit('SIGINT');

		expect(cancel).not.toHaveBeenCalled();
		expect(lifecycle.finishLifecycle()).toBe(interruptStatus.SIGINT);
	});
});
