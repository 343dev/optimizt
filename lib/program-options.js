export const programOptions = {
	shouldConvertToAvif: false,
	shouldConvertToWebp: false,
	isForced: false,
	isLossless: false,
	isVerbose: false,
};

export function setProgramOptions(options) {
	Object.assign(programOptions, options);
	Object.freeze(programOptions);
}
