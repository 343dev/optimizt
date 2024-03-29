import calcRatio from './calc-ratio.js';
import formatBytes from './format-bytes.js';
import log from './log.js';

export default function showTotal(before, after) {
	const ratio = calcRatio(before, after);
	const saved = formatBytes(before - after);

	if (ratio > 0) {
		log(`Yay! You saved ${saved} (${ratio}%)`);
	} else {
		log('Done!');
	}
}
