import { icons } from '../../icons.js';
import { getCurrentUser, logout } from '../../api/api.js';
import { menuTemplate } from '../menu/menu.js';
import { showModal } from '../modal/modal.js';
import { userPreviewTemplate } from '../user-preview/user-preview.js';

const MENU_ITEMS = [
    { href: '/', text: 'Анкеты', icon: icons.cards },
    { href: '/likes', text: 'Симпатии', icon: icons.heart },
    { href: '/messages', text: 'Сообщения', icon: icons.chat, counter: 3 },
    { href: '/test', text: 'Тест совместимости', icon: icons.stars },
    { href: '/profile', text: 'Профиль', icon: icons.user },
];

// TODO: брать счётчики с бэкенда

export function sidebarTemplate(mix = '') {
    const menu = menuTemplate(MENU_ITEMS, 'sidebar__menu');
    return Handlebars.templates['sidebar/sidebar']({ mix, menu });
}

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
