import config from '@343dev/eslint-config';

export default [
	...config,

	{
		ignores: [
			'coverage/',
			'.optimiztrc.cjs',
			// Other checkouts of this repository, mounted below the root by tooling.
			'.delta/',
		],
	},
];
