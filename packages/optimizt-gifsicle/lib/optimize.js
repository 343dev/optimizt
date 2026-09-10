import { Worker } from 'node:worker_threads';

import { createError, errorCodes, outOfMemoryPattern } from './errors.js';
import { normalizeOptions } from './options.js';

export const maximumInputSize = 128 * 1024 * 1024;

const workerUrl = new URL('worker.js', import.meta.url);

function snapshotInput(input) {
	if (!(input instanceof Uint8Array)) {
		throw createError(
			errorCodes.INVALID_INPUT,
			'input must be a Buffer or Uint8Array',
		);
	}
	if (input.byteLength === 0) {
		throw createError(errorCodes.INVALID_INPUT, 'GIF input is empty');
	}
	if (input.byteLength > maximumInputSize) {
		throw createError(
			errorCodes.INVALID_INPUT,
			`GIF input exceeds the ${maximumInputSize}-byte limit`,
		);
	}
	return Uint8Array.from(input);
}

function deserializeError(serialized) {
	const code = Object.values(errorCodes).includes(serialized?.code)
		? serialized.code
		: errorCodes.WORKER_FAILED;
	const details = serialized?.details?.trim();
	const cause = details ? new Error(details) : undefined;
	return createError(code, serialized?.message || 'Gifsicle Worker failed', cause);
}

function classifyWorkerFailure(error) {
	const text = `${error?.code ?? ''} ${error?.message ?? ''}`;
	const code = outOfMemoryPattern.test(text)
		? errorCodes.WASM_OUT_OF_MEMORY
		: errorCodes.WORKER_FAILED;
	const message = code === errorCodes.WASM_OUT_OF_MEMORY
		? 'WebAssembly ran out of memory while optimizing the GIF'
		: 'Gifsicle Worker failed';
	return createError(code, message, error);
}

export function createOperation(input, options) {
	let snapshot;
	let normalizedOptions;
	try {
		snapshot = snapshotInput(input);
		normalizedOptions = normalizeOptions(options);
	} catch (error) {
		return {
			promise: Promise.reject(error),
			terminate: async () => {},
		};
	}

	let worker;
	let isSettled = false;
	let isReceivedTermination = false;
	let message;
	let workerError;

	const promise = new Promise((resolve, reject) => {
		try {
			worker = new Worker(workerUrl, {
				execArgv: [],
				name: 'gifsicle-optimize',
				workerData: {
					input: snapshot.buffer,
					options: normalizedOptions,
				},
				transferList: [snapshot.buffer],
			});
		} catch (error) {
			reject(classifyWorkerFailure(error));
			return;
		}

		worker.once('message', (value) => {
			message = value;
		});
		worker.once('error', (error) => {
			workerError = error;
		});
		worker.once('exit', (exitCode) => {
			isSettled = true;
			if (isReceivedTermination) {
				reject(createError(errorCodes.WORKER_FAILED, 'Gifsicle Worker was terminated'));
				return;
			}
			if (workerError) {
				reject(classifyWorkerFailure(workerError));
				return;
			}
			if (exitCode !== 0) {
				reject(createError(
					errorCodes.WORKER_FAILED,
					`Gifsicle Worker exited unexpectedly (exit code ${exitCode})`,
				));
				return;
			}
			if (!message) {
				reject(createError(
					errorCodes.WORKER_FAILED,
					`Gifsicle Worker exited without a result (exit code ${exitCode})`,
				));
				return;
			}
			if (!message.ok) {
				reject(deserializeError(message.error));
				return;
			}
			resolve(Buffer.from(message.output));
		});
	});

	return {
		promise,
		terminate: async () => {
			if (!worker || isSettled) {
				return;
			}

			isReceivedTermination = true;
			await worker.terminate();
		},
	};
}

export function optimize(input, options) {
	return createOperation(input, options).promise;
}
