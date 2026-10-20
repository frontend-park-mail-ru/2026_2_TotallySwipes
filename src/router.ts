export type PageRender = (root: HTMLElement, router: Router) => void;
type RouteGuard = (path: string) => string | null;

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
     * Регистрирует страницу. Путь '*' - страница по умолчанию.
     *
     * @param {string} path
     * @param {function(HTMLElement, Router): void} render
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

        const render = this.#routes.get(path) ?? this.#routes.get('*');
        if (!render) {
            throw new Error(`Страница для ${path} не зарегистрирована`);
        }

        render(this.#root, this);
        this.#onChange(path);
    }
}
