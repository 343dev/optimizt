import { afterEach, describe, expect, test, vi } from 'vitest';

import { createLifecycle } from '../lib/lifecycle.js';
import { isWindows } from './helpers/platform.js';

const interruptStatus = { SIGINT: isWindows ? 1 : 130, SIGTERM: isWindows ? 1 : 143 };
const releases = [];

afterEach(() => {
	for (const release of releases) release();
	releases.length = 0;
	vi.useRealTimers();
	vi.restoreAllMocks();
});

function installedLifecycle(options) {
	const lifecycle = createLifecycle(options);
	releases.push(lifecycle.install());
	return lifecycle;
}

function childStub() {
	return { kill: vi.fn(), once: vi.fn() };
}

function pendingPromise() {
	return new Promise(() => {});
}

describe('invocation lifecycle', () => {
	test.each(['SIGINT', 'SIGTERM'])('a second %s forces immediate exit', (signal) => {
		const forceExit = vi.fn();
		const lifecycle = installedLifecycle({ forceExit });
		process.emit(signal);
		process.emit(signal);
		expect(forceExit).toHaveBeenCalledExactlyOnceWith(interruptStatus[signal]);
		lifecycle.finish();
	});

	test('the shutdown deadline forces exit', () => {
		vi.useFakeTimers();
		const forceExit = vi.fn();
		const lifecycle = installedLifecycle({ forceExit });
		process.emit('SIGINT');
		vi.advanceTimersByTime(5000);
		expect(forceExit).toHaveBeenCalledExactlyOnceWith(interruptStatus.SIGINT);
		lifecycle.finish();
	});

	test('interrupts active and late resources', () => {
		const lifecycle = installedLifecycle();
		const active = childStub();
		const cancelActive = vi.fn();
		lifecycle.registerChild(active);
		lifecycle.registerCancellable(cancelActive, pendingPromise());
		process.emit('SIGTERM');
		const late = childStub();
		const cancelLate = vi.fn();
		lifecycle.registerChild(late);
		lifecycle.registerCancellable(cancelLate, pendingPromise());

		expect(active.kill).toHaveBeenCalledWith('SIGTERM');
		expect(late.kill).toHaveBeenCalledWith('SIGTERM');
		expect(cancelActive).toHaveBeenCalledOnce();
		expect(cancelLate).toHaveBeenCalledOnce();
		expect(lifecycle.finish()).toBe(interruptStatus.SIGTERM);
	});

	test('release removes only this invocation handlers and clears state ownership', () => {
		const before = process.listenerCount('SIGINT');
		const lifecycle = createLifecycle();
		const release = lifecycle.install();
		expect(process.listenerCount('SIGINT')).toBe(before + 1);
		release();
		expect(process.listenerCount('SIGINT')).toBe(before);
		expect(lifecycle.isInterrupted()).toBe(false);
	});
});
