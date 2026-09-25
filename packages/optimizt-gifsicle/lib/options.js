import { createError, errorCodes } from './errors.js';

const optionNames = new Set(['optimize', 'careful', 'colors', 'lossy', 'gamma']);

function invalid(message) {
	throw createError(errorCodes.INVALID_OPTIONS, message);
}

function isPlainObject(value) {
	if (typeof value !== 'object' || value === null) {
		return false;
	}
	const prototype = Object.getPrototypeOf(value);
	return prototype === Object.prototype || prototype === null;
}

function optionalInteger(name, value, minimum, maximum) {
	if (value === undefined || value === false) {
		return 0;
	}
	if (!Number.isSafeInteger(value) || value < minimum || value > maximum) {
		invalid(`${name} must be false or an integer between ${minimum} and ${maximum}`);
	}
	return value;
}

export function normalizeOptions(options) {
	if (options === undefined) {
		options = {};
	} else if (!isPlainObject(options)) {
		invalid('options must be a plain object');
	}

	for (const name of Object.keys(options)) {
		if (!optionNames.has(name)) {
			invalid(`Unknown option: ${name}`);
		}
	}

	if (options.careful !== undefined && typeof options.careful !== 'boolean') {
		invalid('careful must be a boolean');
	}

	let gammaType = 0;
	let gamma = 2.2;
	if (options.gamma !== undefined && options.gamma !== false) {
		if (options.gamma === 'srgb') {
			gammaType = 0;
		} else if (options.gamma === 'oklab') {
			gammaType = 2;
		} else if (
			typeof options.gamma === 'number'
			&& Number.isFinite(options.gamma)
			&& options.gamma > 0
		) {
			gammaType = 1;
			gamma = options.gamma;
		} else {
			invalid('gamma must be false, a positive finite number, "srgb", or "oklab"');
		}
	}

	return {
		optimize: optionalInteger('optimize', options.optimize, 0, 3),
		careful: options.careful ?? false,
		colors: optionalInteger('colors', options.colors, 2, 256),
		lossy: optionalInteger('lossy', options.lossy, 0, 2_147_483_647),
		gammaType,
		gamma,
	};
}
