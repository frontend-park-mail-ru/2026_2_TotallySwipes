import { getElement } from '../../dom.js';
import { Router } from '../../router.js';
import { sidebarTemplate, loadSidebarUser, initSidebarLogout } from '../sidebar/sidebar.js';
import layoutHbs from './layout.hbs';

export type RenderFunction = (root: HTMLElement, router: Router) => void;

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
    initSidebarLogout(sidebar);

    return getElement(root, '.layout__main');
}

/**
 * Оборачивает страницу в каркас. Если каркас уже есть, меняется только основная область.
 *
 * @param {function(HTMLElement, Router): void} renderPage
 * @returns {function(HTMLElement, Router): void}
 */
export function withLayout(renderPage: RenderFunction): RenderFunction {
    return (root, router) => {
        let main = root.querySelector('.layout__main');

        if (main) {
            main.replaceChildren();
        } else {
            main = renderLayout(root);
        }

        if (!(main instanceof HTMLElement)) return;

        renderPage(main, router);
    };
}
