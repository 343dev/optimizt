import CliProgress from 'cli-progress';

import { getPlural } from './get-plural.js';

export function createProgressBarContainer(totalCount) {
	return new CliProgress.MultiBar({
		format: '{bar} {percentage}% | Processed {value} of {total} ' + getPlural(totalCount, 'operation', 'operations'),
		clearOnComplete: true,
		stream: process.stderr,
	}, CliProgress.Presets.shades_classic);
}
