import { calculateRatio } from './calculate-ratio.js';
import { createProgressBarContainer } from './create-progress-bar-container.js';
import { formatBytes } from './format-bytes.js';
import { getPlural } from './get-plural.js';
import { getRelativePath } from './get-relative-path.js';
import { createLog, LOG_TYPES } from './log.js';
import { OUTCOME_STATUS } from './outcome-status.js';

export function createReporter({ isLossless, isVerbose, mode, operations, shouldUseColor }) {
	const { log, logEmptyLine, logProgress } = createLog({ shouldUseColor });
	const total = operations.length;
	const inputCount = new Set(operations.map(operation => operation.input)).size;
	const progressContainer = createProgressBarContainer(total);
	const progress = progressContainer.create(total, 0);

	return Object.freeze({
		notice(notice) {
			if (!isVerbose || notice.type !== 'duplicate') return;
			const droppedPath = getRelativePath(notice.droppedPath);
			const keptPath = getRelativePath(notice.keptPath);
			log(droppedPath, {
				description: droppedPath === keptPath
					? 'Already included. Skipped duplicate.'
					: `Duplicate of "${keptPath}". Skipped.`,
			});
		},
		operationCompleted(outcome) {
			progress.increment();
			if (outcome.status === OUTCOME_STATUS.PROCESSED) {
				const target = getRelativePath(outcome.output);
				const description = mode === 'convert'
					? `${formatBytes(outcome.before)} → ${formatBytes(outcome.after)}. Ratio: ${outcome.ratio}%`
					: `${formatBytes(outcome.before)} → ${formatBytes(outcome.after)}. Ratio: ${outcome.ratio}%`;
				logProgress(target, { description, progressBarContainer: progressContainer, type: outcome.ratio > 0 ? LOG_TYPES.SUCCESS : LOG_TYPES.WARNING });
			} else if (outcome.status === OUTCOME_STATUS.SKIPPED && isVerbose) {
				logProgress(getRelativePath(outcome.output), { description: 'Skipped', progressBarContainer: progressContainer });
			}
		},
		start() {
			const verb = mode === 'convert' ? 'Converting' : 'Optimizing';
			log(`${verb} ${inputCount} ${getPlural(inputCount, 'image', 'images')} (${isLossless ? 'lossless' : 'lossy'})...`);
		},
		finish(result) {
			progressContainer.update();
			progressContainer.stop();
			if (result.interrupted) {
				logEmptyLine();
				log('Interrupted');
				log(`${result.completed} of ${result.total} operations completed`);
				return;
			}
			renderSummary(result.outcomes, mode === 'convert', { log, logEmptyLine });
		},
	});
}

function renderSummary(outcomes, conversion, { log, logEmptyLine }) {
	const processedOutcomes = outcomes.filter(outcome => outcome.status === OUTCOME_STATUS.PROCESSED);
	const skipped = outcomes.filter(outcome => outcome.status === OUTCOME_STATUS.SKIPPED).length;
	const failures = outcomes.filter(outcome => outcome.status === OUTCOME_STATUS.FAILED).toSorted((left, right) => left.planIndex - right.planIndex);
	const summary = [[processedOutcomes.length, 'processed'], [skipped, 'skipped'], [failures.length, 'failed']]
		.filter(([count]) => count > 0).map(([count, label]) => `${count} ${label}`).join(', ');
	logEmptyLine();
	log(summary);
	for (const failure of failures) log(getRelativePath(failure.output), { description: failure.error?.message || String(failure.error), type: LOG_TYPES.ERROR });
	if (processedOutcomes.length === 0) return;
	const before = processedOutcomes.reduce((sum, outcome) => sum + outcome.before, 0);
	const after = processedOutcomes.reduce((sum, outcome) => sum + outcome.after, 0);
	log(conversion ? `${formatBytes(after)} created` : `${formatBytes(before - after)} saved (${calculateRatio(before, after)}%)`);
}
