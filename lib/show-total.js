import { calculateRatio } from './calculate-ratio.js';
import { formatBytes } from './format-bytes.js';
import { log, logEmptyLine } from './log.js';

export function showTotal(before, after) {
	const ratio = calculateRatio(before, after);
	const saved = formatBytes(before - after);

	logEmptyLine();
	log(ratio > 0
		? `Yay! You saved ${saved} (${ratio}%)`
		: 'Done!',
	);
}
