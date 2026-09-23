import js from '@eslint/js';
import globals from 'globals';

export default [
    { ignores: ['src/templates.js'] },
    js.configs.recommended,
    {
        files: ['src/**/*.js'],
        languageOptions: {
            globals: { ...globals.browser, Handlebars: 'readonly' },
        },
    },
    {
        files: ['server/**/*.js'],
        languageOptions: { globals: globals.node },
    },
];
