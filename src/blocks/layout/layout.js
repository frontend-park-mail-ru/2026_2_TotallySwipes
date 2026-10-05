import { sidebarTemplate, loadSidebarUser, initSidebarLogout } from '../sidebar/sidebar.js';

/**
 * Рендерит каркас с сайдбаром.
 *
 * @param {HTMLElement} root
 * @returns {HTMLElement} Основная область для контента страницы.
 */
export function renderLayout(root) {
    root.innerHTML = Handlebars.templates['layout/layout']({
        sidebar: sidebarTemplate('layout__sidebar'),
    });

    const sidebar = root.querySelector('.sidebar');
    loadSidebarUser(sidebar);
    initSidebarLogout(sidebar);

    return root.querySelector('.layout__main');
}

/**
 * Оборачивает страницу в каркас. Если каркас уже есть, меняется только основная область.
 *
 * @param {function(HTMLElement, Router): void} renderPage
 * @returns {function(HTMLElement, Router): void}
 */
export function withLayout(renderPage) {
    return (root, router) => {
        let main = root.querySelector('.layout__main');

        if (main) {
            main.replaceChildren();
        } else {
            main = renderLayout(root);
        }

        renderPage(main, router);
    };
}
