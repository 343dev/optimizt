import { spawn } from 'node:child_process';
import fs from 'node:fs/promises';
import os, { EOL } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// Every behaviour test drives the real CLI process with an argv array against real
// temporary directories, so nothing in a test path can be reinterpreted by a shell.
const dirname = path.dirname(fileURLToPath(import.meta.url));
const cliPath = path.resolve(dirname, '..', '..', 'cli.js');
const fixturesPath = path.resolve(dirname, '..', 'images');
const temporaryDirectories = [];

// Re-exported so a process-level test file needs only this harness.
export { isPrivileged, isWindows } from './platform.js';

export async function makeTemporaryDirectory() {
	const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'optimizt-test-'));
	temporaryDirectories.push(directory);
	return directory;
}

export async function removeTemporaryDirectories() {
	await Promise.all(temporaryDirectories.map(directory => fs.rm(directory, { force: true, recursive: true })));
	temporaryDirectories.length = 0;
}

export async function copyFixture(directory, fixtureName, outputName = fixtureName) {
	const target = path.join(directory, outputName);
	await fs.mkdir(path.dirname(target), { recursive: true });
	await fs.copyFile(path.join(fixturesPath, fixtureName), target);
	return target;
}

// The whole summary line, so an assertion also states which outcomes were absent.
export function summaryLine(counts) {
	return `i ${counts}${EOL}`;
}

// Outcome counts are readable individually because absent outcomes are not printed.
export function outcomeCount(stderr, label) {
	const match = new RegExp(String.raw`(\d+) ${label}`).exec(stderr);
	return match ? Number(match[1]) : 0;
}

export async function fileSize(filePath) {
	const stat = await fs.stat(filePath);
	return stat.size;
}

export async function findTemporaryWriteLeftovers(directory) {
	const names = await fs.readdir(directory);
	return names.filter(name => /\.\d{4,}$/.test(name) || name.includes('.optimizt'));
}

export function startCli(argumentsList, { environment = {} } = {}) {
	const child = spawn(process.execPath, [cliPath, ...argumentsList], {
		env: { ...process.env, ...environment },
		stdio: ['ignore', 'pipe', 'pipe'],
	});

	let stdout = '';
	let stderr = '';
	const stderrWatchers = new Set();

	child.stdout.setEncoding('utf8').on('data', (chunk) => {
		stdout += chunk;
	});
	child.stderr.setEncoding('utf8').on('data', (chunk) => {
		stderr += chunk;
		for (const watcher of stderrWatchers) watcher();
	});

	const finished = new Promise((resolve, reject) => {
		child.on('error', reject);
		child.on('close', (code, signal) => resolve({ code, signal, stderr, stdout }));
	});

	return {
		child,
		finished,
		// Signal tests must act while work is in flight, so they wait for evidence of
		// progress instead of sleeping for an arbitrary duration.
		async whenStderrIncludes(text) {
			const appeared = new Promise((resolve) => {
				const check = () => {
					if (!stderr.includes(text)) return;
					stderrWatchers.delete(check);
					resolve(true);
				};
				stderrWatchers.add(check);
				check();
			});
			const exited = (async () => {
				await finished;
				return false;
			})();

			if (await Promise.race([appeared, exited])) return;
			throw new Error(`CLI exited before stderr included ${JSON.stringify(text)}: ${stderr}`);
		},
	};
}

export function runCli(argumentsList, options) {
	return startCli(argumentsList, options).finished;
}
