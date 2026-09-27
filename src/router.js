export class Router {
    #root;
    #routes = new Map();
    #onChange = () => {};
    #guard = () => null;

    constructor(root) {
        this.#root = root;
    }

    register(path, render) {
        this.#routes.set(path, render);
        return this;
    }

    onChange(callback) {
        this.#onChange = callback;
        return this;
    }

    beforeEach(guard) {
        this.#guard = guard;
        return this;
    }

    start() {
        window.addEventListener('popstate', () => this.#render(location.pathname));

        document.addEventListener('click', (event) => {
            const link = event.target.closest('a[data-link]');
            if (!link) {
                return;
            }

            if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) {
                return;
            }

            event.preventDefault();
            this.go(link.getAttribute('href'));
        });

        this.#render(location.pathname);
    }

    go(path, { replace = false } = {}) {
        if (replace) {
            history.replaceState(null, '', path);
        } else {
            history.pushState(null, '', path);
        }

        this.#render(path);
    }

    #render(path) {
        const redirect = this.#guard(path);
        if (redirect) {
            history.replaceState(null, '', redirect);
            this.#render(redirect);
            return;
        }

        const render = this.#routes.get(path) ?? this.#routes.get('*');
        render(this.#root);
        this.#onChange(path);
    }
}
