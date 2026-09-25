import config from '@343dev/eslint-config';

export default [
	{
		ignores: [
			'.cache/**',
			'.claude/**',
			'dist/**',
			'upstream/gifsicle/**',
		],
	},
	...config,
];
