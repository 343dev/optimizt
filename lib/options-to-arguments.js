export function optionsToArguments({ options, prefix = '--', concat = false }) {
	const arguments_ = [];

	for (const [key, value] of Object.entries(options)) {
		if (value === false) {
			continue;
		}

		const option = `${prefix}${key}`;

		if (value === true) {
			arguments_.push(option);
		} else if (concat) {
			arguments_.push(`${option}=${value}`);
		} else {
			arguments_.push(option, String(value));
		}
	}

	return arguments_;
}
