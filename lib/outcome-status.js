export const OUTCOME_STATUS = Object.freeze({
	FAILED: 'failed',
	// An operation that was running when shutdown began and could not complete.
	INTERRUPTED: 'interrupted',
	PROCESSED: 'processed',
	SKIPPED: 'skipped',
	// An operation the plan never started because shutdown had already begun.
	UNSTARTED: 'unstarted',
});
