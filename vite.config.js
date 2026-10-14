import { defineConfig } from 'vite';
import Handlebars from 'handlebars';
import babel from '@rolldown/plugin-babel';
import checker from 'vite-plugin-checker';
import babelConfig from './babel.config.json' with { type: 'json' };

/**
 * Превращает .hbs в ES-модуль: шаблон компилируется при сборке,
 * а в браузер попадает только рантайм handlebars.
 *
 * @returns {import('vite').Plugin}
 */
function handlebarsPlugin() {
    return {
        name: 'handlebars',
        transform(code, id) {
            if (!id.endsWith('.hbs')) {
                return null;
            }

            const spec = Handlebars.precompile(code);

            return {
                code: [
                    "import Handlebars from 'handlebars/runtime';",
                    `export default Handlebars.template(${spec});`,
                ].join('\n'),
                map: null,
            };
        },
    };
}

export default defineConfig({
    plugins: [
        handlebarsPlugin(),
        babel(babelConfig),
        checker({ typescript: true, enableBuild: false }),
    ],

    oxc: false,
    server: {
        host: true,
        port: 8000,
        strictPort: true,
    },
    preview: {
        host: true,
        port: 8000,
        strictPort: true,
    },
    optimizeDeps: {
        include: ['handlebars/runtime'],
    },
});
