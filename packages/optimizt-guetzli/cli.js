import process from 'node:process';

import createModule from './dist/guetzli.mjs';

const defaultQuality = 90;
const minimumQuality = 84;
const maximumQuality = 110;

function fail(message) {
	process.stderr.write(`${message}\n`);
	process.exitCode = 1;
}

function parseQuality(arguments_) {
	if (arguments_.length === 0) {
		return defaultQuality;
	}
	if (arguments_.length !== 2 || arguments_[0] !== '--quality') {
		throw new Error(
			`Usage: guetzli-runner [--quality ${minimumQuality}-${maximumQuality}]`,
		);
	}
	const quality = Number(arguments_[1]);
	if (!Number.isInteger(quality) || quality < minimumQuality || quality > maximumQuality) {
		throw new Error(`quality must be an integer between ${minimumQuality} and ${maximumQuality}`);
	}
	return quality;
}

async function readInput() {
	const chunks = await Array.fromAsync(process.stdin);
	return Buffer.concat(chunks);
}

try {
	const quality = parseQuality(process.argv.slice(2));
	const input = await readInput();
	const module = await createModule();
	const inputPointer = module._malloc(input.byteLength);
	if (inputPointer === 0) {
		throw new Error('Could not allocate WebAssembly input memory');
	}

	let status;
	try {
		module.HEAPU8.set(input, inputPointer);
		status = module._guetzli_encode(inputPointer, input.byteLength, quality);
	} finally {
		module._free(inputPointer);
	}
	if (status !== 0) {
		throw new Error('Guetzli could not process the JPEG input');
	}

	const outputPointer = module._guetzli_output_data();
	const outputSize = module._guetzli_output_size();
	// Encoding may grow memory, so reacquire the current heap view here.
	const output = module.HEAPU8.subarray(outputPointer, outputPointer + outputSize);
	await new Promise((resolve, reject) => {
		let settled = false;
		const rejectOnce = (error) => {
			if (!settled) {
				settled = true;
				reject(error);
			}
		};
		process.stdout.once('error', rejectOnce);
		process.stdout.write(output, (error) => {
			if (error) {
				rejectOnce(error);
			} else if (!settled) {
				settled = true;
				resolve();
			}
		});
	});
} catch (error) {
	fail(error instanceof Error ? error.message : String(error));
}
