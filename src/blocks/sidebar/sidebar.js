import { icons } from '../../icons.js';
import { getCurrentUser, logout } from '../../api/api.js';
import { menuTemplate } from '../menu/menu.js';
import { showModal } from '../modal/modal.js';
import { userPreviewTemplate } from '../user-preview/user-preview.js';

const MENU_ITEMS = [
    { href: '/', text: 'Анкеты', icon: icons.cards },
    { href: '/likes', text: 'Симпатии', icon: icons.heart, disabled: true },
    { href: '/messages', text: 'Сообщения', icon: icons.chat, counter: 3, disabled: true },
    { href: '/test', text: 'Тест совместимости', icon: icons.stars },
    { href: '/profile', text: 'Профиль', icon: icons.user, disabled: true },
];

// TODO: брать счётчики с бэкенда
// TODO: убрать disabled, когда разделы будут готовы

/**
 * @param {string} [mix]
 * @returns {string}
 */
export function sidebarTemplate(mix = '') {
    const menu = menuTemplate(MENU_ITEMS, 'sidebar__menu');
    return Handlebars.templates['sidebar/sidebar']({ mix, menu });
}

/**
 * Загружает текущего пользователя и показывает его в сайдбаре.
 *
 * @param {HTMLElement} sidebar
 */
export async function loadSidebarUser(sidebar) {
    const userContainer = sidebar.querySelector('.sidebar__user');

    try {
        const user = await getCurrentUser();
        userContainer.innerHTML = userPreviewTemplate(user);
    } catch (error) {
        console.error('Не удалось загрузить пользователя:', error);
        // TODO: Обработать экран неудачного запроса за пользователем
    }
}

/**
 * Выходит из аккаунта. При ошибке предлагает попробовать ещё раз.
 */
async function handleLogout() {
    try {
        await logout();
        location.replace('/login');
    } catch (error) {
        console.error('Не удалось завершить сессию:', error);
        showModal({
            title: 'Не удалось выйти из аккаунта',
            text: 'Похоже, что наблюдаются проблемы с подключением. Попробовать ещё раз?',
            buttonText: 'Выйти',
            cancelText: 'Отмена',
            onClose: (result) => {
                if (result === 'confirm') {
                    handleLogout();
                }
            },
        });
    }
}

/**
 * Вешает на кнопку выхода подтверждение.
 *
 * @param {HTMLElement} sidebar
 */
export function initSidebarLogout(sidebar) {
    sidebar.querySelector('.sidebar__logout').addEventListener('click', () => {
        showModal({
            title: 'Выйти из аккаунта?',
            text: 'Чтобы снова смотреть анкеты, нужно будет войти ещё раз.',
            buttonText: 'Выйти',
            cancelText: 'Отмена',
            onClose: (result) => {
                if (result === 'confirm') {
                    handleLogout();
                }
            },
        });
    });
}
