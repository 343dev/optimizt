// Codec libraries own their option schemas, so their messages arrive without any
// Optimizt context. This states which mode, format, and configuration produced the
// attempt and keeps the library's own reason intact.
export function describeCodecFailure({ error, mode, format, isLossless, configPath }) {
	const profile = isLossless ? 'lossless' : 'lossy';
	const action = mode === 'convert'
		? `convert the image to ${format.toUpperCase()}`
		: `optimize the ${format.toUpperCase()} image`;
	return new Error(`Unable to ${action} with the ${profile} profile and configuration file ${configPath}: ${error.message}`, { cause: error });
}
