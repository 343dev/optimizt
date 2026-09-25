export const errorCodes = Object.freeze({
	INVALID_INPUT: 'INVALID_INPUT',
	INVALID_OPTIONS: 'INVALID_OPTIONS',
	PROCESSING_FAILED: 'PROCESSING_FAILED',
	WASM_OUT_OF_MEMORY: 'WASM_OUT_OF_MEMORY',
	WORKER_FAILED: 'WORKER_FAILED',
});

export const outOfMemoryPattern = /ERR_WORKER_OUT_OF_MEMORY|cannot enlarge memory|out of memory|bad_alloc|\bOOM\b/i;

export function createError(code, message, cause) {
	const error = cause === undefined
		? new Error(message)
		: new Error(message, { cause });
	error.code = code;
	return error;
}
