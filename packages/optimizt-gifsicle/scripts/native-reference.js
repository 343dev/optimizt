import { execFile } from 'node:child_process';
import process from 'node:process';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);
// Must match the default sRGB gamma in lib/options.js.
const DEFAULT_GAMMA = 2.2;

export function nativeArguments(fixture, options, output) {
	// Must mirror the gamma-type codes in lib/options.js and native-driver.c.
	let gammaType = 0;
	if (options.gamma === 'oklab') {
		gammaType = 2;
	} else if (typeof options.gamma === 'number') {
		gammaType = 1;
	}
	return [
		fixture,
		String(options.optimize || 0),
		String(Number(options.careful || false)),
		String(options.colors || 0),
		String(options.lossy || 0),
		String(gammaType),
		String(gammaType === 1 ? options.gamma : DEFAULT_GAMMA),
		output,
	];
}

export function nativeLauncher() {
	let launcher = [];
	if (process.env.GIFSICLE_NATIVE_LAUNCHER) {
		try {
			launcher = JSON.parse(process.env.GIFSICLE_NATIVE_LAUNCHER);
		} catch {
			throw new Error(
				'GIFSICLE_NATIVE_LAUNCHER must be a nonempty JSON array of strings',
			);
		}
	}
	if (
		!Array.isArray(launcher)
		|| launcher.some(argument => typeof argument !== 'string')
		|| (
			process.env.GIFSICLE_NATIVE_LAUNCHER !== undefined
			&& launcher.length === 0
		)
	) {
		throw new Error('GIFSICLE_NATIVE_LAUNCHER must be a nonempty JSON array of strings');
	}
	return launcher;
}

export async function runNative(executable, launcher, arguments_) {
	const { stdout, stderr } = await execFileAsync(
		launcher[0] ?? executable,
		launcher.length > 0
			? [...launcher.slice(1), executable, ...arguments_]
			: arguments_,
	);
	if (stderr) {
		process.stderr.write(stderr);
	}
	return stdout;
}
