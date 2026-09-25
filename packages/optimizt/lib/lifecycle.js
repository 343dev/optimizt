export function createLifecycle({ forceExit = defaultForceExit, shutdownMilliseconds = 5000 } = {}) {
	const state = {
		activeChildren: new Set(),
		activeCancellations: new Set(),
		forceExitTimer: undefined,
		interruptCount: 0,
		interruptedSignal: undefined,
		listeners: new Map(),
	};

	function interrupt(signal) {
		state.interruptCount += 1;
		state.interruptedSignal ||= signal;
		if (state.interruptCount > 1) return forceExit(signalExitCode(signal));
		for (const child of state.activeChildren) child.kill('SIGTERM');
		for (const cancel of state.activeCancellations) void cancel();
		state.forceExitTimer = setTimeout(() => forceExit(signalExitCode(signal)), shutdownMilliseconds);
		state.forceExitTimer.unref();
	}

	return Object.freeze({
		finish() {
			if (state.forceExitTimer) clearTimeout(state.forceExitTimer);
			return state.interruptedSignal ? signalExitCode(state.interruptedSignal) : undefined;
		},
		install() {
			for (const signal of ['SIGINT', 'SIGTERM']) {
				const listener = interrupt.bind(undefined, signal);
				state.listeners.set(signal, listener);
				process.on(signal, listener);
			}
			return release.bind(undefined, state);
		},
		interrupt,
		isInterrupted: () => Boolean(state.interruptedSignal),
		registerCancellable(cancel, completion) {
			state.activeCancellations.add(cancel);
			void completion.finally(() => state.activeCancellations.delete(cancel)).catch(() => {});
			if (state.interruptedSignal) void cancel();
		},
		registerChild(child) {
			state.activeChildren.add(child);
			child.once('close', () => state.activeChildren.delete(child));
			if (state.interruptedSignal) child.kill('SIGTERM');
		},
	});
}

function release(state) {
	for (const [signal, listener] of state.listeners) process.removeListener(signal, listener);
	state.listeners.clear();
	if (state.forceExitTimer) clearTimeout(state.forceExitTimer);
}

function defaultForceExit(code) {
	process.removeAllListeners('exit');
	process.exit(code); // eslint-disable-line n/no-process-exit
}

function signalExitCode(signal) {
	if (process.platform === 'win32') return 1;
	return signal === 'SIGINT' ? 130 : 143;
}
