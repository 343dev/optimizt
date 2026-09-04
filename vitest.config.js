import { defineConfig } from 'vitest/config';

export default defineConfig({
	test: {
		// Every test of this project lives in tests/. Scoping the run keeps other checkouts
		// of the repository, which tooling may mount anywhere below the root, out of it.
		include: ['tests/**/*.test.js'],
		// Image processing is real work: Guetzli alone needs several seconds per image.
		testTimeout: 60_000,
	},
});
