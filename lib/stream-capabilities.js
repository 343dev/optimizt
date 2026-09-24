export function canUseColor() {
	return canUseUnicode() && !process.env.NO_COLOR;
}

export function canUseUnicode() {
	return Boolean(process.stderr.isTTY) && process.env.TERM !== 'dumb';
}
