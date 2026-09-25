import config from '@343dev/eslint-config';

export default [
	...config,

	{
		ignores: [
			'coverage/',
			'vendor/',
			'.optimiztrc.cjs',
		],
	},
];
