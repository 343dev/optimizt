export function canUseColor(shouldUseColor = !process.env.NO_COLOR) {
	return canUseUnicode() && shouldUseColor;
}

export function canUseUnicode() {
	return Boolean(process.stderr.isTTY) && process.env.TERM !== 'dumb';
}
