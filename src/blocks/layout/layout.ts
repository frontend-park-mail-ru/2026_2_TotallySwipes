import { getElement } from '../../utils/dom.js';
import type { PageRender, RouteParams } from '../../router.js';
import { sidebarTemplate, loadSidebarUser } from '../sidebar/sidebar.js';
import layoutHbs from './layout.hbs';

/**
 * Рендерит каркас с сайдбаром.
 *
 * @param {HTMLElement} root
 * @returns {HTMLElement} Основная область для контента страницы.
 */
export function renderLayout(root: HTMLElement) {
    root.innerHTML = layoutHbs({
        sidebar: sidebarTemplate('layout__sidebar'),
    });

    const sidebar = getElement(root, '.sidebar');
    loadSidebarUser(sidebar);

    return getElement(root, '.layout__main');
}

/**
 * Оборачивает страницу в каркас. Если каркас уже есть, меняется только основная область.
 *
 * @param {function(HTMLElement, Router, RouteParams): void} renderPage
 * @param updatePage - Возвращает true, если текущую страницу удалось обновить на месте.
 * @returns {function(HTMLElement, Router, RouteParams): void}
 */
export function withLayout(
    renderPage: PageRender,
    updatePage?: (root: HTMLElement, params: RouteParams) => boolean,
): PageRender {
    return (root, router, params) => {
        let main = root.querySelector('.layout__main');

        if (main instanceof HTMLElement) {
            if (updatePage && updatePage(main, params)) return;
            main.replaceChildren();
        } else {
            main = renderLayout(root);
        }

        if (!(main instanceof HTMLElement)) return;

        renderPage(main, router, params);
    };
}
