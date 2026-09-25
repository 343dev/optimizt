import { calculateRatio } from './calculate-ratio.js';
import { formatBytes } from './format-bytes.js';
import { getRelativePath } from './get-relative-path.js';
import { log, logEmptyLine } from './log.js';
import { OUTCOME_STATUS } from './outcome-status.js';

export function showTotal(before, after, outcomes, { conversion = false } = {}) {
	const processed = outcomes.filter(outcome => outcome.status === OUTCOME_STATUS.PROCESSED).length;
	const skipped = outcomes.filter(outcome => outcome.status === OUTCOME_STATUS.SKIPPED).length;
	const unstarted = outcomes.filter(outcome => outcome.status === OUTCOME_STATUS.UNSTARTED).length;
	const failures = outcomes
		.filter(outcome => outcome.status === OUTCOME_STATUS.FAILED)
		.toSorted((left, right) => left.planIndex - right.planIndex);
	// Only outcomes that occurred are named. Every operation holds one of these statuses,
	// and showTotal runs only for a non-empty plan, so at least one count is always left.
	const summary = [
		[processed, 'processed'],
		[skipped, 'skipped'],
		[failures.length, 'failed'],
		[unstarted, 'not started'],
	]
		.filter(([count]) => count > 0)
		.map(([count, label]) => `${count} ${label}`)
		.join(', ');
	logEmptyLine();
	log(summary);
	for (const failure of failures) {
		log(failure.output ? getRelativePath(failure.output) : 'Operation failed', {
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
