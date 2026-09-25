import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { optionsToArguments } from './options-to-arguments.js';

const DIAGNOSTIC_LIMIT = 64 * 1024;

export const nodeExecutable = process.execPath;
export const guetzliRunner = path.resolve(
	path.dirname(fileURLToPath(import.meta.url)),
	'../vendor/guetzli/cli.js',
);

export function encodeWithGuetzli(input, options, lifecycle, {
	command = nodeExecutable,
	runner = guetzliRunner,
} = {}) {
	return new Promise((resolve, reject) => {
		const child = spawn(command, [runner, ...optionsToArguments({ options })]);
		lifecycle.registerChild(child);
		const stdout = [];
		let diagnostic = Buffer.alloc(0);
		let isTruncated = false;
		let isSettled = false;

		child.stdout.on('data', (chunk) => {
			stdout.push(chunk);
		});
		child.stderr.on('data', (chunk) => {
			diagnostic = Buffer.concat([diagnostic, chunk]);
			if (diagnostic.length > DIAGNOSTIC_LIMIT) {
				diagnostic = diagnostic.subarray(diagnostic.length - DIAGNOSTIC_LIMIT);
				isTruncated = true;
			}
		});
		child.once('error', error => rejectOnce(new Error(`Guetzli failed to start: ${error.message}`, { cause: error })));
		child.stdin.on('error', (error) => {
			if (error.code !== 'EPIPE') rejectOnce(new Error(`Could not send input to Guetzli: ${error.message}`, { cause: error }));
		});
		child.once('close', (code, signal) => {
			if (isSettled) return;
			if (code === 0) {
				isSettled = true;
				resolve(Buffer.concat(stdout));
				return;
			}
			const reason = diagnostic.toString('utf8').trim();
			const exit = signal ? `terminated by signal ${signal}` : `exited with code ${code}`;
			const prefix = isTruncated ? '[stderr truncated] ' : '';
			rejectOnce(new Error(`${prefix}${reason || 'Guetzli failed'} (${exit})`));
		});
		child.stdin.end(input);

		function rejectOnce(error) {
			if (isSettled) return;
			isSettled = true;
			reject(error);
		}
	});
}
