import fs from 'node:fs/promises';
import path from 'node:path';

import { getRelativePath } from './get-relative-path.js';
import { logProgressVerbose } from './log.js';

const WINDOWS_RESERVED_NAME = /^(?:con|prn|aux|nul|com[1-9]|lpt[1-9])(?:\.|$)/i;
const INVALID_GENERATED_CHARACTERS = /[<>:"|?*]/;
// A path that does not exist reports ENOENT, or ENOTDIR when one of its ancestors is a file.
const MISSING_PATH_CODES = new Set(['ENOENT', 'ENOTDIR']);

export async function prepareOperationPlan({
	inputPaths,
	outputDirectoryPath,
	extensions,
	formats,
	force,
	prefix,
	suffix,
}) {
	validateNamePart(prefix, 'Prefix');
	validateNamePart(suffix, 'Suffix');

	let outputRoot;
	if (outputDirectoryPath) {
		const requestedOutputRoot = path.resolve(outputDirectoryPath);
		const outputStat = await statExplicitPath(requestedOutputRoot, 'Output path');
		if (!outputStat.isDirectory()) throw new Error(`Output path is not a directory: ${requestedOutputRoot}`);
		await fs.access(requestedOutputRoot, fs.constants.R_OK | fs.constants.W_OK | fs.constants.X_OK);
		outputRoot = await fs.realpath(requestedOutputRoot);
	}

	// Operands are inspected in the given order so that deduplication keeps the first
	// spelling and reports the rest deterministically.
	const operands = [];
	const keptOperands = new Map();
	for (const inputPath of inputPaths) {
		const operand = await inspectOperand(inputPath, extensions);
		const kept = keptOperands.get(pathKey(operand.realPath));
		if (kept) {
			reportDuplicate(operand, kept);
			continue;
		}
		keptOperands.set(pathKey(operand.realPath), operand);
		operands.push(operand);
	}

	const directories = operands.filter(operand => operand.kind === 'directory');
	if (outputRoot) validateDirectoryOverlap(directories);

	const discovered = [];
	for (const operand of operands) {
		if (operand.kind === 'file') {
			discovered.push(operand);
		} else {
			discovered.push(...await walkDirectory(operand, extensions));
		}
	}

	const uniqueInputs = new Map();
	for (const input of discovered) {
		const kept = uniqueInputs.get(pathKey(input.realPath));
		if (kept) {
			reportDuplicate(input, kept);
			continue;
		}
		uniqueInputs.set(pathKey(input.realPath), input);
	}

	const operations = [];
	for (const input of uniqueInputs.values()) {
		const placement = calculatePlacement(input, outputRoot);
		for (const format of formats) {
			const extension = format === 'optimize' ? path.extname(placement) : `.${format}`;
			const basename = `${prefix}${path.basename(placement, path.extname(placement))}${suffix}${extension}`;
			if (format !== 'optimize' || outputRoot || prefix || suffix) validateGeneratedBasename(basename);
			let output = path.join(path.dirname(placement), basename);
			if (format === 'optimize' && !outputRoot && !prefix && !suffix) output = input.realPath;
			operations.push({ format, input: input.realPath, output: path.resolve(output) });
		}
	}

	operations.sort((left, right) => left.input.localeCompare(right.input) || left.format.localeCompare(right.format) || left.output.localeCompare(right.output));
	await validateOutputs(operations, { force, outputRoot });
	return operations;
}

async function inspectOperand(inputPath, extensions) {
	const operandPath = path.resolve(inputPath);
	let lstat;
	try {
		lstat = await fs.lstat(operandPath);
	} catch (error) {
		throw new Error(`Input does not exist or is inaccessible: ${operandPath}: ${error.message}`, { cause: error });
	}

	if (lstat.isSymbolicLink()) {
		const realPath = await fs.realpath(operandPath);
		const stat = await fs.stat(realPath);
		if (!stat.isFile()) throw new Error(`Explicit symbolic link does not refer to a file: ${operandPath}`);
		assertSupported(operandPath, extensions);
		return { givenPath: inputPath, kind: 'file', operandPath, realPath, root: undefined };
	}
	if (lstat.isFile()) {
		assertSupported(operandPath, extensions);
		return { givenPath: inputPath, kind: 'file', operandPath, realPath: await fs.realpath(operandPath), root: undefined };
	}
	if (lstat.isDirectory()) return { givenPath: inputPath, kind: 'directory', operandPath, realPath: await fs.realpath(operandPath) };
	throw new Error(`Input is not a file or directory: ${operandPath}`);
}

async function walkDirectory(root, extensions) {
	const files = [];
	async function walk(current) {
		let entries;
		try {
			entries = await fs.readdir(current, { withFileTypes: true });
		} catch (error) {
			throw new Error(`Cannot traverse directory ${current}: ${error.message}`, { cause: error });
		}
		entries.sort((left, right) => left.name.localeCompare(right.name));
		for (const entry of entries) {
			const entryPath = path.join(current, entry.name);
			if (entry.isDirectory()) await walk(entryPath);
			else if (entry.isFile() && isSupported(entryPath, extensions)) {
				files.push({ kind: 'file', operandPath: entryPath, realPath: await fs.realpath(entryPath), root });
			}
		}
	}
	await walk(root.operandPath);
	return files;
}

function calculatePlacement(input, outputRoot) {
	if (!outputRoot) return input.operandPath;
	if (!input.root) return path.join(outputRoot, path.basename(input.operandPath));
	return path.join(outputRoot, path.relative(input.root.operandPath, input.operandPath));
}

async function validateOutputs(operations, { force, outputRoot }) {
	const outputs = new Map();
	for (const operation of operations) {
		if (outputRoot) assertContained(outputRoot, operation.output);
		let identity = operation.output;
		let targetStat;
		try {
			const lstat = await fs.lstat(operation.output);
			if (lstat.isSymbolicLink()) {
				if (operation.format !== 'optimize' && !force) {
					operation.skipReason = 'File already exists';
				} else {
					identity = await fs.realpath(operation.output);
					if (outputRoot) assertContained(outputRoot, identity);
					operation.output = identity;
					targetStat = await fs.stat(identity);
				}
			} else targetStat = lstat;
			if (!operation.skipReason && !targetStat?.isFile()) throw new Error(`Output target is not a regular file: ${operation.output}`);
			if (!operation.skipReason && targetStat.nlink > 1) throw new Error(`Refusing to replace multiply hard-linked file: ${operation.output}`);
			if (operation.format !== 'optimize' && !force) operation.skipReason = 'File already exists';
		} catch (error) {
			// The target cannot exist yet, either because nothing is there or because an
			// ancestor is not a directory. Both are diagnosed by walking up to what exists.
			if (!MISSING_PATH_CODES.has(error.code)) throw error;
			const canonicalOutput = await canonicalizeThroughExistingAncestor(operation.output);
			if (outputRoot) assertContained(outputRoot, canonicalOutput);
			operation.output = canonicalOutput;
			identity = canonicalOutput;
		}
		const key = pathKey(identity);
		const previous = outputs.get(key);
		if (previous) throw new Error(`Output collision: ${previous.output} and ${operation.output}`);
		outputs.set(key, operation);
	}
}

async function canonicalizeThroughExistingAncestor(output) {
	let current = path.dirname(output);
	const missingSegments = [path.basename(output)];
	while (true) {
		try {
			const stat = await fs.stat(current);
			if (!stat.isDirectory()) throw new Error(`Output parent is not a directory: ${current}`);
			await fs.access(current, fs.constants.W_OK | fs.constants.X_OK);
			const realAncestor = await fs.realpath(current);
			return path.join(realAncestor, ...missingSegments);
		} catch (error) {
			if (!MISSING_PATH_CODES.has(error.code)) throw error;
			missingSegments.unshift(path.basename(current));
			const parent = path.dirname(current);
			if (parent === current) throw error;
			current = parent;
		}
	}
}

// Omitted work must be explainable, so deduplication is visible in verbose output. Two
// operands can also reach one file through the same path, as overlapping roots do.
function reportDuplicate(dropped, kept) {
	// Explicit operands are named as the user spelled them; discovered files have only a path.
	const droppedPath = getRelativePath(dropped.givenPath ?? dropped.operandPath);
	const keptPath = getRelativePath(kept.givenPath ?? kept.operandPath);
	logProgressVerbose(droppedPath, {
		description: droppedPath === keptPath
			? 'Already planned once. Not planned again'
			: `Duplicate of '${keptPath}'. Not planned again`,
	});
}

function validateDirectoryOverlap(directories) {
	for (let index = 0; index < directories.length; index += 1) {
		for (let other = index + 1; other < directories.length; other += 1) {
			const left = directories[index].realPath;
			const right = directories[other].realPath;
			if (isContained(left, right) || isContained(right, left)) throw new Error('Overlapping directory operands cannot be used with --output');
		}
	}
}

function validateNamePart(value, label) {
	if (value.includes('\0') || value.includes('/') || value.includes('\\')) throw new Error(`${label} must not contain path separators or NUL`);
}

function validateGeneratedBasename(basename) {
	const stem = basename.replace(/\..*$/, '');
	const hasControlCharacter = [...basename].some(character => character.codePointAt(0) < 32);
	if (!basename || basename === '.' || basename === '..' || basename.endsWith('.') || basename.endsWith(' ') || hasControlCharacter || INVALID_GENERATED_CHARACTERS.test(basename) || WINDOWS_RESERVED_NAME.test(stem)) {
		throw new Error(`Generated filename is not portable: ${basename}`);
	}
}

function assertSupported(filePath, extensions) {
	if (!isSupported(filePath, extensions)) throw new Error(`Unsupported explicit file: ${filePath}`);
}

function isSupported(filePath, extensions) {
	return extensions.includes(path.extname(filePath).toLowerCase().slice(1));
}

function assertContained(root, target) {
	if (!isContained(root, target)) throw new Error(`Output escapes permitted root: ${target}`);
}

function isContained(root, target) {
	const relative = path.relative(root, target);
	return relative === '' || (!relative.startsWith(`..${path.sep}`) && relative !== '..' && !path.isAbsolute(relative));
}

function pathKey(value) {
	const normalized = path.normalize(value);
	return process.platform === 'linux' ? normalized : normalized.toLowerCase();
}

async function statExplicitPath(value, label) {
	try {
		return await fs.stat(value);
	} catch (error) {
		throw new Error(`${label} does not exist or is inaccessible: ${value}: ${error.message}`, { cause: error });
	}
}
