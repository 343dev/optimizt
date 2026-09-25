import config from '@343dev/eslint-config';

export default [
	{
		ignores: [
			'.cache/**',
			'dist/**',
			'upstream/**',
		],
	},
	...config,
	{
		rules: {
			'unicorn/consistent-boolean-name': 'off',
			'unicorn/no-computed-property-existence-check': 'off',
			'unicorn/no-negated-array-predicate': 'off',
			'unicorn/no-return-array-push': 'off',
			'unicorn/no-top-level-assignment-in-function': 'off',
			'unicorn/prefer-await': 'off',
			'unicorn/prefer-continue': 'off',
			'unicorn/prefer-early-return': 'off',
			'unicorn/prefer-iterator-to-array': 'off',
			'unicorn/prefer-minimal-ternary': 'off',
			'unicorn/prefer-number-is-safe-integer': 'off',
			'unicorn/prefer-promise-with-resolvers': 'off',
			'unicorn/require-array-sort-compare': 'off',
		},
	},
];
