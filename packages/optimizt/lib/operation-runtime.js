import os from 'node:os';

import pLimit from 'p-limit';

import { OUTCOME_STATUS } from './outcome-status.js';

export function createOperationRuntime({ concurrency = os.availableParallelism(), detect, lifecycle, read, writer }) {
	const operationLimit = pLimit(concurrency);
	const resourceLimits = new Map([['guetzli', pLimit(1)]]);

	return {
		async execute({ operations, policy, selectCodec, onCompleted = () => {} }) {
			const pendingOutcomes = await Promise.all(operations.map((operation, planIndex) => operationLimit(async () => {
				if (lifecycle.isInterrupted()) return;
				try {
					if (operation.skipReason) return recordOutcome(onCompleted, { output: operation.output, planIndex, status: OUTCOME_STATUS.SKIPPED });
					const input = await read(operation);
					const metadata = await detect(operation, input);
					const codec = selectCodec(metadata, operation);
					const encode = async () => {
						if (lifecycle.isInterrupted()) return;
						return codec.encode(input, metadata, operation);
					};
					const encoded = codec.resource && resourceLimits.has(codec.resource)
						? await resourceLimits.get(codec.resource)(encode)
						: await encode();
					if (!encoded || lifecycle.isInterrupted()) return;
					const decision = await policy.complete({ encoded, input, metadata, operation });
					if (decision.write) await writer.write(operation.output, encoded);
					return recordOutcome(onCompleted, {
						...decision, output: operation.output, planIndex,
						status: decision.write ? OUTCOME_STATUS.PROCESSED : OUTCOME_STATUS.SKIPPED,
					});
				} catch (error) {
					if (lifecycle.isInterrupted()) return;
					return recordOutcome(onCompleted, { error, output: operation.output, planIndex, status: OUTCOME_STATUS.FAILED });
				}
			})));
			const outcomes = pendingOutcomes.filter(Boolean);
			return {
				completed: outcomes.length,
				failed: outcomes.filter(outcome => outcome.status === OUTCOME_STATUS.FAILED).length,
				interrupted: lifecycle.isInterrupted(), outcomes, total: operations.length,
			};
		},
	};
}

function recordOutcome(onCompleted, outcome) {
	onCompleted(outcome);
	return outcome;
}
