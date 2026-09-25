import CliProgress from 'cli-progress';

import { getPlural } from './get-plural.js';
import { canUseUnicode } from './stream-capabilities.js';

const silentProgressBar = Object.freeze({
	increment() {},
	update() {},
});

// Animated progress belongs to a decorating terminal only. Elsewhere every call is
// accepted and rendered nowhere, so callers do not branch on stream capability.
const silentProgressBarContainer = Object.freeze({
	create: () => silentProgressBar,
	isRendering: false,
	log() {},
	stop() {},
	update() {},
});

export function createProgressBarContainer(totalCount) {
	if (!canUseUnicode()) return silentProgressBarContainer;

	const container = new CliProgress.MultiBar({
		format: '{bar} {percentage}% | Processed {value} of {total} ' + getPlural(totalCount, 'operation', 'operations'),
		clearOnComplete: true,
		stream: process.stderr,
	}, CliProgress.Presets.shades_classic);
	container.isRendering = true;

	return container;
}
