import config from '@343dev/eslint-config';
import globals from 'globals';

export default [
	...config,

	{
		ignores: ['.optimiztrc.cjs'],
	},

	{
		languageOptions: {
			globals: globals.jest,
		},
	},
];
