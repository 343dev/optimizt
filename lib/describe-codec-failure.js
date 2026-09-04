// Codec libraries own their option schemas, so their messages arrive without any
// Optimizt context. This states which mode, format, and configuration produced the
// attempt and keeps the library's own reason intact.
export function describeCodecFailure({ error, mode, format, isLossless, configPath }) {
	const profile = isLossless ? 'lossless' : 'lossy';
	return new Error(`${mode} ${format} (${profile}) using ${configPath}: ${error.message}`, { cause: error });
}
