export type RouteParams = Record<string, string>;
export type PageRender = (root: HTMLElement, router: Router, params: RouteParams) => void;
type RouteGuard = (path: string) => string | null;

/**
 * Сравнивает путь с шаблоном. Сегмент шаблона с ':' совпадает с любым непустым
 * сегментом пути и попадает в параметры под именем без ':'.
 *
 * @param {string} pattern - Шаблон, например '/matches/:matchId/places'.
 * @param {string} path
 * @returns {Object<string, string>|null} Параметры или null, если путь не подходит.
 */
function matchPattern(pattern: string, path: string): RouteParams | null {
    const patternParts = pattern.split('/');
    const pathParts = path.split('/');

    if (patternParts.length !== pathParts.length) {
        return null;
    }

    const params: RouteParams = {};

    for (const [i, part] of patternParts.entries()) {
        const value = pathParts[i];

        if (part.startsWith(':')) {
            if (!value) {
                return null;
            }

            params[part.slice(1)] = value;
        } else if (part !== value) {
            return null;
        }
    }

    return params;
}

/**
 * SPA-роутер на History API.
 */
export class Router {
    #root: HTMLElement;
    #routes = new Map<string, PageRender>();
    #onChange: (path: string) => void = () => {};
    #guard: RouteGuard = () => null;

    /**
     * @param {HTMLElement} root - Контейнер, в который рендерятся страницы.
     */
    constructor(root: HTMLElement) {
        this.#root = root;
    }

    /**
     * Регистрирует страницу. Путь '*' - страница по умолчанию. Сегменты пути
     * с ':' (например '/matches/:matchId') страница получает в params.
     *
     * @param {string} path
     * @param {function(HTMLElement, Router, RouteParams): void} render
     * @returns {Router}
     */
    register(path: string, render: PageRender) {
        this.#routes.set(path, render);
        return this;
    }

    /**
     * @param {function(string): void} callback - Вызывается после каждого перехода.
     * @returns {Router}
     */
    onChange(callback: (path: string) => void) {
        this.#onChange = callback;
        return this;
    }

    /**
     * Задаёт проверку перед переходом.
     *
     * @param {function(string): (string|null)} guard - Возвращает путь для редиректа или null.
     * @returns {Router}
     */
    beforeEach(guard: RouteGuard) {
        this.#guard = guard;
        return this;
    }

    /**
     * Перехватывает клики по ссылкам с data-link, слушает popstate и рендерит текущий путь.
     */
    start() {
        window.addEventListener('popstate', () => this.#render(location.pathname));

        document.addEventListener('click', (event) => {
            if (!(event.target instanceof Element)) {
                return;
            }

            const href = event.target.closest('a[data-link]')?.getAttribute('href');
            if (!href) {
                return;
            }

            if (
                event.button !== 0 ||
                event.metaKey ||
                event.ctrlKey ||
                event.shiftKey ||
                event.altKey
            ) {
                return;
            }

            event.preventDefault();
            this.go(href);
        });

        this.#render(location.pathname);
    }

    /**
     * Переходит на страницу.
     *
     * @param {string} path
     * @param {Object} [options]
     * @param {boolean} [options.replace=false] - Заменить запись в истории вместо добавления.
     */
    go(path: string, { replace = false }: { replace?: boolean } = {}) {
        if (replace) {
            history.replaceState(null, '', path);
        } else {
            history.pushState(null, '', path);
        }

        this.#render(path);
    }

    #render(path: string) {
        const redirect = this.#guard(path);
        if (redirect) {
            history.replaceState(null, '', redirect);
            this.#render(redirect);
            return;
        }

        const route = this.#match(path);
        if (!route) {
            throw new Error(`Страница для ${path} не зарегистрирована`);
        }

        route.render(this.#root, this, route.params);
        this.#onChange(path);
    }

    /**
     * Ищет страницу для пути: сначала точное совпадение, затем шаблоны с ':', затем '*'.
     *
     * @param {string} path
     * @returns {{render: PageRender, params: RouteParams}|null}
     */
    #match(path: string): { render: PageRender; params: RouteParams } | null {
        const exact = this.#routes.get(path);
        if (exact) {
            return { render: exact, params: {} };
        }

        for (const [pattern, render] of this.#routes) {
            if (!pattern.includes(':')) {
                continue;
            }

            const params = matchPattern(pattern, path);
            if (params) {
                return { render, params };
            }
        }

        const fallback = this.#routes.get('*');
        return fallback ? { render: fallback, params: {} } : null;
    }
}
