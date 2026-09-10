import { parentPort, workerData } from 'node:worker_threads';

import createModule from '../dist/gifsicle.mjs';
import { errorCodes, outOfMemoryPattern } from './errors.js';

if (parentPort === null) {
	throw new Error('The Gifsicle runtime must run in a Worker Thread');
}

const statuses = {
	1: errorCodes.INVALID_INPUT,
	2: errorCodes.PROCESSING_FAILED,
	3: errorCodes.WASM_OUT_OF_MEMORY,
};

function postFailure(code, message, details) {
	parentPort.postMessage({
		ok: false,
		error: { code, message, details },
	});
}

async function optimize() {
	const diagnostics = [];
	const module = await createModule({
		print(line) {
			diagnostics.push(line);
		},
		printErr(line) {
			diagnostics.push(line);
		},
	});
	const input = new Uint8Array(workerData.input);
	const pointer = module._malloc(input.byteLength);
	if (pointer === 0) {
		postFailure(
			errorCodes.WASM_OUT_OF_MEMORY,
			'WebAssembly could not allocate memory for the GIF input',
			diagnostics.join('\n'),
		);
		return;
	}

	let status;
	try {
		module.HEAPU8.set(input, pointer);
		status = module._gifsicle_optimize(
			pointer,
			input.byteLength,
			workerData.options.optimize,
			workerData.options.careful ? 1 : 0,
			workerData.options.colors,
			workerData.options.lossy,
			workerData.options.gammaType,
			workerData.options.gamma,
		);
	} finally {
		module._free(pointer);
	}

	if (status !== 0) {
		const details = diagnostics.join('\n').trim();
		const bridgeMessage = module.UTF8ToString(module._gifsicle_error_message());
		const code = statuses[status] ?? errorCodes.PROCESSING_FAILED;
		module._gifsicle_reset();
		postFailure(
			code,
			bridgeMessage || 'Gifsicle optimization failed',
			details,
		);
		return;
	}

	const outputPointer = module._gifsicle_output_data();
	const outputSize = module._gifsicle_output_size();
	const heapLength = module.HEAPU8.byteLength;
	if (
		outputPointer === 0
		|| outputSize === 0
		|| outputPointer > heapLength
		|| outputSize > heapLength - outputPointer
	) {
		module._gifsicle_reset();
		postFailure(
			errorCodes.PROCESSING_FAILED,
			'Gifsicle produced an invalid output range',
			diagnostics.join('\n'),
		);
		return;
	}
	const output = module.HEAPU8.slice(outputPointer, outputPointer + outputSize);
	module._gifsicle_reset();
	parentPort.postMessage({ ok: true, output: output.buffer }, [output.buffer]);
}

try {
	await optimize();
} catch (error) {
	const message = error instanceof Error ? error.message : String(error);
	postFailure(
		outOfMemoryPattern.test(message)
			? errorCodes.WASM_OUT_OF_MEMORY
			: errorCodes.WORKER_FAILED,
		message,
		'',
	);
}
