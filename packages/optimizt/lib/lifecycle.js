const state = {
	activeChildren: new Set(),
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

export function installSignalHandlers() {
	for (const signal of ['SIGINT', 'SIGTERM']) {
		process.on(signal, () => {
			state.interruptCount += 1;
			state.interruptedSignal ||= signal;
			// A second interrupt is the emergency escape hatch and must not wait for cleanup.
			if (state.interruptCount > 1) process.exit(signalExitCode(signal)); // eslint-disable-line n/no-process-exit
			for (const child of state.activeChildren) child.kill('SIGTERM');
			// Sharp offers no cancellation for a running pipeline, so shutdown is bounded
			// instead: whatever is still native-bound loses the process after five seconds.
			state.forceExitTimer = setTimeout(() => process.exit(signalExitCode(signal)), 5000); // eslint-disable-line n/no-process-exit
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

function signalExitCode(signal) {
	if (process.platform === 'win32') return 1;
	return signal === 'SIGINT' ? 130 : 143;
}
