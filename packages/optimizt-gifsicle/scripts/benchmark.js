import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { cpus, tmpdir } from 'node:os';
import path from 'node:path';
import { performance } from 'node:perf_hooks';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

import optimize from '../index.js';
import {
	nativeArguments,
	nativeLauncher,
	runNative,
} from './native-reference.js';

const fixtureUrl = new URL('../test/fixtures/animated.gif', import.meta.url);
const fixturePath = fileURLToPath(fixtureUrl);
const input = await readFile(fixtureUrl);
const nativeExecutable = process.env.GIFSICLE_NATIVE;
const launcher = nativeLauncher();
const cases = [
	{ name: 'no-options', options: {} },
	{
		name: 'lossless',
		options: { optimize: 3, careful: true, colors: 256, lossy: 0, gamma: 1 },
	},
	{
		name: 'lossy',
		options: { optimize: 3, careful: false, colors: 256, lossy: 100, gamma: 1 },
	},
];
const iterations = Number(process.env.GIFSICLE_BENCHMARK_ITERATIONS ?? 10);

if (!Number.isSafeInteger(iterations) || iterations < 1) {
	throw new Error('GIFSICLE_BENCHMARK_ITERATIONS must be a positive integer');
}
if (!nativeExecutable) {
	throw new Error('GIFSICLE_NATIVE must identify the canonical native reference');
}

async function measure(operation) {
	const durations = [];
	let outputSize;
	for (let index = 0; index < iterations; index += 1) {
		const start = performance.now();
		outputSize = await operation(index);
		durations.push(performance.now() - start);
	}
	return {
		iterations,
		meanMilliseconds: durations.reduce((sum, value) => sum + value, 0) / iterations,
		minimumMilliseconds: Math.min(...durations),
		maximumMilliseconds: Math.max(...durations),
		outputSize,
	};
}

const directory = await mkdtemp(path.join(tmpdir(), 'gifsicle-benchmark-'));
const results = [];
try {
	for (const [caseIndex, benchmarkCase] of cases.entries()) {
		const wasm = await measure(async () => {
			const output = await optimize(input, benchmarkCase.options);
			return output.length;
		});
		const native = await measure(async (iteration) => {
			const outputPath = path.join(directory, `${caseIndex}-${iteration}.gif`);
			await runNative(
				nativeExecutable,
				launcher,
				nativeArguments(fixturePath, benchmarkCase.options, outputPath),
			);
			const output = await readFile(outputPath);
			return output.length;
		});
		results.push({
			name: benchmarkCase.name,
			options: benchmarkCase.options,
			wasm,
			native,
		});
	}
} finally {
	await rm(directory, { recursive: true, force: true });
}

console.log(JSON.stringify({
	schemaVersion: 1,
	environment: {
		platform: process.platform,
		architecture: process.arch,
		node: process.version,
		cpus: cpus().map(cpu => cpu.model),
		nativeProfile: 'Linux x64, GCC 14.2.0, -O3 -DNDEBUG, no threads, no SIMD',
	},
	method: {
		wasmDurationsIncludeFreshWorkerAndWebAssemblyInitialization: true,
		nativeDurationsIncludeFreshProcessInitialization: true,
		hardRatioGate: false,
	},
	input: {
		fixture: 'animated.gif',
		size: input.length,
	},
	results,
}, undefined, 2));
