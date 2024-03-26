export default function optionsToArguments({ options, prefix = '--', concat = false }) {
	// eslint-disable-next-line unicorn/no-array-reduce
	return Object.keys(options).reduce((accumulator, key) => {
		const value = options[key];
		const shouldAddKey = value !== false;
		const shouldAddValue = value !== true;

		if (!shouldAddKey) {
			return accumulator;
		}

		return [
			...accumulator,
			`${prefix}${key}${(shouldAddValue && concat ? `=${value}` : '')}`,
			...shouldAddValue && !concat ? [value] : [],
		];
	}, []);
}
