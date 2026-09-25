const state = {
	activeChildren: new Set(),
	activeCancellations: new Set(),
	forceExitTimer: undefined,
	interruptCount: 0,
	interruptedSignal: undefined,
};

export function registerChild(child) {
	state.activeChildren.add(child);
	child.once('close', () => state.activeChildren.delete(child));

	// An operation already in flight can reach its external encoder after the interrupt
	// arrived. No encoder may keep running once shutdown started, whenever it was spawned.
	if (isInterrupted()) child.kill('SIGTERM');
}

export function registerCancellable(cancel, completion) {
	state.activeCancellations.add(cancel);
	void completion.then(
		() => state.activeCancellations.delete(cancel),
		() => state.activeCancellations.delete(cancel),
	);

	if (isInterrupted()) void cancel();
}

export function installSignalHandlers() {
	for (const signal of ['SIGINT', 'SIGTERM']) {
		process.on(signal, () => {
			state.interruptCount += 1;
			state.interruptedSignal ||= signal;
			// A second interrupt is the emergency escape hatch and must not wait for cleanup.
			if (state.interruptCount > 1) return forceExit(signal);
			for (const child of state.activeChildren) child.kill('SIGTERM');
			for (const cancel of state.activeCancellations) void cancel();
			// Sharp offers no cancellation for a running pipeline, so shutdown is bounded
			// instead: whatever is still native-bound loses the process after five seconds.
			state.forceExitTimer = setTimeout(() => forceExit(signal), 5000);
			state.forceExitTimer.unref();
		});
	}
}

export function isInterrupted() {
	return Boolean(state.interruptedSignal);
}

export function finishLifecycle() {
	if (state.forceExitTimer) clearTimeout(state.forceExitTimer);
	return state.interruptedSignal ? signalExitCode(state.interruptedSignal) : undefined;
}

function forceExit(signal) {
	// Forced shutdown must bypass synchronous exit hooks too: Sharp WASM's hook
	// waits for libvips workers and can deadlock while a pipeline is still active.
	// Normal completion keeps these hooks; only the emergency paths abandon cleanup.
	process.removeAllListeners('exit');
	process.exit(signalExitCode(signal)); // eslint-disable-line n/no-process-exit
}

function signalExitCode(signal) {
	if (process.platform === 'win32') return 1;
	return signal === 'SIGINT' ? 130 : 143;
}
