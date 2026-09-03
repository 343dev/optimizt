import { calculateRatio } from './calculate-ratio.js';
import { formatBytes } from './format-bytes.js';
import { getRelativePath } from './get-relative-path.js';
import { log, logEmptyLine } from './log.js';
import { OUTCOME_STATUS } from './outcome-status.js';

export function showTotal(before, after, outcomes, { conversion = false } = {}) {
	const processed = outcomes.filter(outcome => outcome.status === OUTCOME_STATUS.PROCESSED).length;
	const skipped = outcomes.filter(outcome => outcome.status === OUTCOME_STATUS.SKIPPED).length;
	const interrupted = outcomes.filter(outcome => outcome.status === OUTCOME_STATUS.INTERRUPTED).length;
	const unstarted = outcomes.filter(outcome => outcome.status === OUTCOME_STATUS.UNSTARTED).length;
	const failures = outcomes
		.filter(outcome => outcome.status === OUTCOME_STATUS.FAILED)
		.toSorted((left, right) => left.planIndex - right.planIndex);
	// Interruption counts appear only when they happened, so ordinary runs keep a short summary.
	const interruptionSummary = [
		...interrupted > 0 ? [`${interrupted} interrupted`] : [],
		...unstarted > 0 ? [`${unstarted} not started`] : [],
	].map(part => `, ${part}`).join('');
	logEmptyLine();
	log(`${processed} processed, ${skipped} skipped, ${failures.length} failed${interruptionSummary}`);
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
