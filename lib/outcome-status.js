export const OUTCOME_STATUS = Object.freeze({
	FAILED: 'failed',
	PROCESSED: 'processed',
	SKIPPED: 'skipped',
	// An operation an interruption left undone, whether it never started or was
	// abandoned in flight. Either way the work still has to be repeated.
	UNSTARTED: 'unstarted',
});
