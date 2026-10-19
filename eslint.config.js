import js from '@eslint/js';
import globals from 'globals';
import tseslint from 'typescript-eslint';

export default [
    { ignores: ['dist'] },
    js.configs.recommended,
    ...tseslint.configs.recommended.map((config) => ({ ...config, files: ['**/*.ts'] })),
    {
        files: ['src/**/*.{js,ts}'],
        languageOptions: {
            globals: globals.browser,
        },
    },
    {
        files: ['server/**/*.{js,ts}'],
        languageOptions: { globals: globals.node },
    },
    {
        rules: {
            'eol-last': ['error', 'always'],
        },
    },
];
