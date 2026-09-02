export function colorize(...arguments_) {
	const string_ = arguments_.join(' ');
	const shouldColor = Boolean(process.stderr.isTTY)
		&& !process.env.NO_COLOR
		&& process.env.TERM !== 'dumb';
	const buildColor = (start, end) => `${shouldColor ? start : ''}${string_}${shouldColor ? end : ''}`;

	return {
		dim: buildColor('\u{1B}[2m', '\u{1B}[22m'),
		reset: buildColor('\u{1B}[0m', '\u{1B}[0m'),

		black: buildColor('\u{1B}[30m', '\u{1B}[39m'),
		blue: buildColor('\u{1B}[34m', '\u{1B}[39m'),
		cyan: buildColor('\u{1B}[36m', '\u{1B}[39m'),
		green: buildColor('\u{1B}[32m', '\u{1B}[39m'),
		magenta: buildColor('\u{1B}[35m', '\u{1B}[39m'),
		red: buildColor('\u{1B}[31m', '\u{1B}[39m'),
		white: buildColor('\u{1B}[37m', '\u{1B}[39m'),
		yellow: buildColor('\u{1B}[33m', '\u{1B}[39m'),

		bgBlack: buildColor('\u{1B}[40m', '\u{1B}[0m'),
		bgBlue: buildColor('\u{1B}[44m', '\u{1B}[0m'),
		bgCyan: buildColor('\u{1B}[46m', '\u{1B}[0m'),
		bgGreen: buildColor('\u{1B}[42m', '\u{1B}[0m'),
		bgMagenta: buildColor('\u{1B}[45m', '\u{1B}[0m'),
		bgRed: buildColor('\u{1B}[41m', '\u{1B}[0m'),
		bgWhite: buildColor('\u{1B}[47m', '\u{1B}[0m'),
		bgYellow: buildColor('\u{1B}[43m', '\u{1B}[0m'),
	};
}
