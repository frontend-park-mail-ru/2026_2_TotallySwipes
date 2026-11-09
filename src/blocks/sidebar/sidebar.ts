import { icons } from '../../icons.js';
import { getCurrentUser } from '../../api/api.js';
import { type MenuItem, menuTemplate } from '../menu/menu.js';
import { userPreviewTemplate } from '../user-preview/user-preview.js';
import sidebarHbs from './sidebar.hbs';
import { getElement } from '../../utils/dom.js';

const MENU_ITEMS: MenuItem[] = [
    { href: '/', text: 'Анкеты', icon: icons.cards },
    { href: '/matches', text: 'Симпатии', icon: icons.heart },
    { href: '/messages', text: 'Сообщения', icon: icons.chat, counter: 3, disabled: true },
    { href: '/test', text: 'Тест совместимости', icon: icons.stars },
    { href: '/profile', text: 'Профиль', icon: icons.user },
];

// TODO: брать счётчики с бэкенда

/**
 * @param {string} [mix]
 * @returns {string}
 */
export function sidebarTemplate(mix = '') {
    const menu = menuTemplate(MENU_ITEMS, 'sidebar__menu');
    return sidebarHbs({ mix, menu });
}

/**
 * Загружает текущего пользователя и показывает его в сайдбаре.
 *
 * @param {HTMLElement} sidebar
 */
export async function loadSidebarUser(sidebar: HTMLElement) {
    const userContainer = getElement(sidebar, '.sidebar__user');

    try {
        const user = await getCurrentUser();
        userContainer.innerHTML = userPreviewTemplate(user);
    } catch (error) {
        console.error('Не удалось загрузить пользователя:', error);
        // TODO: Обработать экран неудачного запроса за пользователем
    }
}

/**
 * Перезагружает пользователя в sidebar, если он есть на странице. Вызывается после
 * внесения изменений в анкету.
 */
export function refreshSidebarUser() {
    const sidebar = document.querySelector<HTMLElement>('.sidebar');

    if (sidebar) {
        loadSidebarUser(sidebar);
    }
}
