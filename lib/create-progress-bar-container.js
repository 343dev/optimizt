import CliProgress from 'cli-progress';

import getPlural from './get-plural.js';

export default function createCliProgressContainer(totalCount) {
	return new CliProgress.MultiBar({
		format: `{bar} {percentage}% | Processed {value} of {total} ${getPlural(totalCount, 'image', 'images')}`,
		clearOnComplete: true,
	}, CliProgress.Presets.shades_classic);
}
