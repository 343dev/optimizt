import { spawn } from 'node:child_process';
import { mkdtemp, readFile, rm, stat } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

import createModule from '../dist/guetzli.mjs';

const quality = 95;

function usage() {
	return 'Usage: node scripts/benchmark.js <1mp.jpg> <4mp.jpg> [8mp.jpg]\n';
}

function enforceThresholds(results) {
	const failed = results.filter(result => result.wasmToNativeRatio > 2);
	if (failed.length > 0) {
		throw new Error(
			`WebAssembly/native duration exceeds 2x for ${failed.map(result => result.fixture).join(', ')}`,
		);
	}
}

async function medianOperation(operation) {
	await operation();
	const measurements = [];
	for (let index = 0; index < 3; index += 1) {
		const started = process.hrtime.bigint();
		const result = await operation();
		measurements.push({
			milliseconds: Number(process.hrtime.bigint() - started) / 1e6,
			...result,
		});
	}
	return measurements.toSorted(
		(left, right) => left.milliseconds - right.milliseconds,
	)[1];
}

async function wasmEncode(module, input) {
	const inputPointer = module._malloc(input.byteLength);
	if (inputPointer === 0) {
		throw new Error('Could not allocate WebAssembly input memory');
	}
	try {
		module.HEAPU8.set(input, inputPointer);
		if (module._guetzli_encode(inputPointer, input.byteLength, quality) !== 0) {
			throw new Error('Guetzli encoding failed');
		}
	} finally {
		module._free(inputPointer);
	}
	return module._guetzli_output_size();
}

async function nativeEncode(binary, quality, inputPath, outputPath) {
	await new Promise((resolve, reject) => {
		const child = spawn(binary, [String(quality), inputPath, outputPath], { stdio: 'ignore' });
		child.once('error', reject);
		child.once('exit', (code) => {
			if (code === 0) {
				resolve();
			} else {
				reject(new Error(`Native reference exited with status ${code}`));
			}
		});
	});
	const outputStatistics = await stat(outputPath);
	return { outputBytes: outputStatistics.size };
}

async function measure(inputPath) {
	const defaultBinary = process.env.NATIVE_OUTPUT_DIR
		? path.join(process.env.NATIVE_OUTPUT_DIR, 'guetzli-native-reference')
		: fileURLToPath(new URL(
			'../.cache/native-reference/guetzli-native-reference',
			import.meta.url,
		));
	const binary = process.env.GUETZLI_NATIVE_REFERENCE ?? defaultBinary;
	const directory = await mkdtemp(path.join(tmpdir(), 'guetzli-benchmark-'));
	const nativeOutput = path.join(directory, 'native.jpg');
	try {
		const input = await readFile(inputPath);
		const initialization = await medianOperation(async () => {
			const module = await import(`../dist/guetzli.mjs?benchmark=${Math.random()}`);
			await module.default();
			return {};
		});
		const module = await createModule();
		const native = await medianOperation(
			async () => nativeEncode(
				binary,
				quality,
				inputPath,
				nativeOutput,
			),
		);
		const wasm = await medianOperation(async () => ({
			outputBytes: await wasmEncode(module, input),
		}));
		return {
			fixture: path.basename(inputPath),
			inputBytes: input.byteLength,
			nativeMilliseconds: native.milliseconds,
			nativeOutputBytes: native.outputBytes,
			wasmMilliseconds: wasm.milliseconds,
			wasmOutputBytes: wasm.outputBytes,
			wasmToNativeRatio: wasm.milliseconds / native.milliseconds,
			wasmInitializationMilliseconds: initialization.milliseconds,
		};
	} finally {
		await rm(directory, { recursive: true, force: true });
	}
}

if (process.argv.length < 4 || process.argv.length > 5) {
	process.stderr.write(usage());
	process.exitCode = 2;
} else {
	const results = [];
	for (const inputPath of process.argv.slice(2)) {
		results.push(await measure(inputPath));
	}
	process.stdout.write(`${JSON.stringify({
		node: process.version,
		platform: `${process.platform}-${process.arch}`,
		quality,
		results,
	}, undefined, '\t')}\n`);
	enforceThresholds(results);
}
