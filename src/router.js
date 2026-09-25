export class Router {
    #root;
    #routes = new Map();
    #onChange = () => {};

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

    go(path) {
        history.pushState(null, '', path);
        this.#render(path);
    }

    #render(path) {
        const render = this.#routes.get(path) ?? this.#routes.get('*');
        this.#root.replaceChildren();
        render(this.#root);
        this.#onChange(path);
    }
}
