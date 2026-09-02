import { calculateRatio } from './calculate-ratio.js';
import { formatBytes } from './format-bytes.js';
import { log, logEmptyLine } from './log.js';

export function showTotal(before, after, outcomes, { conversion = false } = {}) {
	const processed = outcomes.filter(outcome => outcome.status === 'processed').length;
	const skipped = outcomes.filter(outcome => outcome.status === 'skipped').length;
	const failures = outcomes
		.filter(outcome => outcome.status === 'failed')
		.toSorted((left, right) => left.planIndex - right.planIndex);
	logEmptyLine();
	log(`${processed} processed, ${skipped} skipped, ${failures.length} failed`);
	for (const failure of failures) {
		log(failure.output || 'Operation failed', {
			description: failure.error?.message || String(failure.error),
			type: 'error',
		});
	}
	if (processed === 0) return;
	if (conversion) {
		log(`${formatBytes(after)} created`);
		return;
	}
	const ratio = calculateRatio(before, after);
	log(`${formatBytes(before - after)} saved (${ratio}%)`);
}
