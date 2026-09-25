import { afterEach, describe, expect, test, vi } from 'vitest';

import { createProgressBarContainer } from '../lib/create-progress-bar-container.js';

const originalIsTTY = process.stderr.isTTY;

afterEach(() => {
	process.stderr.isTTY = originalIsTTY;
	vi.unstubAllEnvs();
	vi.restoreAllMocks();
});

function prepareStderr({ isTTY, term }) {
	process.stderr.isTTY = isTTY;
	vi.stubEnv('TERM', term);
	return vi.spyOn(process.stderr, 'write').mockImplementation(() => true);
}

describe('progress bar container', () => {
	test.each([
		['stderr is not a terminal', { isTTY: false, term: 'xterm-256color' }],
		['the terminal is dumb', { isTTY: true, term: 'dumb' }],
	])('renders nothing when %s', (_name, capabilities) => {
		const stderrSpy = prepareStderr(capabilities);

		const container = createProgressBarContainer(3);
		const progressBar = container.create(3, 0);
		progressBar.increment();
		container.log('inline message');
		container.update();
		container.stop();

		expect(container.isRendering).toBe(false);
		expect(stderrSpy).not.toHaveBeenCalled();
	});

	test('renders the requested operation total on a capable terminal', () => {
		const stderrSpy = prepareStderr({ isTTY: true, term: 'xterm-256color' });

		const container = createProgressBarContainer(3);
		try {
			const progressBar = container.create(3, 0);
			progressBar.increment();
			container.update();

			expect(container.isRendering).toBe(true);
			expect(stderrSpy.mock.calls.flat().join('')).toContain('Processed 1 of 3 operations');
		} finally {
			container.stop();
		}
	});
});
