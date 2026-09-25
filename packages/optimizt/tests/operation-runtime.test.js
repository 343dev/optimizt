import { describe, expect, test, vi } from 'vitest';

import { createOperationRuntime } from '../lib/operation-runtime.js';

function deferred() {
	const { promise, resolve } = Promise.withResolvers();
	return { promise, resolve };
}

function operation(index, format = 'jpeg') {
	return { input: `input-${index}`, output: `output-${index}`, detectedFormat: format };
}

const writer = { write: vi.fn(async () => {}) };
const read = async operation_ => Buffer.from(operation_.input);
const detect = async operation_ => ({ format: operation_.detectedFormat });
const policy = {
	complete: ({ encoded }) => ({ bytesAfter: encoded.length, write: true }),
};

describe('Operation runtime', () => {
	test('serializes detected JPEG Guetzli work regardless of the filename extension', async () => {
		let active = 0;
		let maximum = 0;
		const gates = [deferred(), deferred()];
		let started = 0;
		const runtime = createOperationRuntime({ concurrency: 2, detect, lifecycle: { isInterrupted: () => false }, read, writer });
		const execution = runtime.execute({
			operations: [operation(0), operation(1)],
			policy,
			selectCodec: () => ({ resource: 'guetzli', encode: async () => {
				active += 1;
				maximum = Math.max(maximum, active);
				const gate = gates[started++];
				await gate.promise;
				active -= 1;
				return Buffer.from('jpeg');
			} }),
		});
		await vi.waitFor(() => expect(started).toBe(1));
		gates[0].resolve();
		await vi.waitFor(() => expect(started).toBe(2));
		gates[1].resolve();
		await execution;

		expect(maximum).toBe(1);
	});

	test('does not read the entire plan before encoding begins', async () => {
		let reads = 0;
		let readsWhenFirstEncodeStarted;
		const runtime = createOperationRuntime({
			concurrency: 2,
			detect,
			lifecycle: { isInterrupted: () => false },
			read: async (operation_) => {
				reads += 1;
				return Buffer.from(operation_.input);
			},
			writer,
		});
		await runtime.execute({
			operations: Array.from({ length: 20 }, (_, index) => operation(index, 'png')),
			policy,
			selectCodec: () => ({ encode: async () => {
				readsWhenFirstEncodeStarted ??= reads;
				return Buffer.from('png');
			} }),
		});

		expect(readsWhenFirstEncodeStarted).toBeLessThanOrEqual(2);
	});

	test('continues independent work after a failure and returns outcomes in plan order', async () => {
		const runtime = createOperationRuntime({ concurrency: 2, detect, lifecycle: { isInterrupted: () => false }, read, writer });
		const result = await runtime.execute({
			operations: [operation(0, 'png'), operation(1, 'png')],
			policy,
			selectCodec: (_metadata, operation_) => ({ encode: async () => {
				if (operation_.input === 'input-0') throw new Error('broken');
				return Buffer.from('ok');
			} }),
		});

		expect(result.outcomes.map(outcome => outcome.status)).toEqual(['failed', 'processed']);
		expect(result.failed).toBe(1);
	});

	test('omits queued and abandoned work after interruption', async () => {
		let isInterrupted = false;
		const gate = deferred();
		const runtime = createOperationRuntime({ concurrency: 1, detect, lifecycle: { isInterrupted: () => isInterrupted }, read, writer });
		const execution = runtime.execute({
			operations: [operation(0), operation(1)],
			policy,
			selectCodec: () => ({ encode: async () => {
				await gate.promise;
				throw new Error('terminated');
			} }),
		});
		isInterrupted = true;
		gate.resolve();
		const result = await execution;

		expect(result.interrupted).toBe(true);
		expect(result.outcomes).toEqual([]);
		expect(result.completed).toBe(0);
		expect(result.total).toBe(2);
	});
});
