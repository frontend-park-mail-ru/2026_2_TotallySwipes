import { icons } from '../../icons.js';
import { getCurrentUser } from '../../api/api.js';
import { menuTemplate } from '../menu/menu.js';
import { userPreviewTemplate } from '../user-preview/user-preview.js';

const MENU_ITEMS = [
    { href: '/', text: 'Анкеты', icon: icons.cards },
    { href: '/likes', text: 'Симпатии', icon: icons.heart},
    { href: '/messages', text: 'Сообщения', icon: icons.chat, counter: 3},
    { href: '/test', text: 'Тест совместимости', icon: icons.stars },
    { href: '/profile', text: 'Профиль', icon: icons.user },
];

// TODO: брать счётчики с бэкенда


export function sidebarTemplate(mix = '') {
    const menu = menuTemplate(MENU_ITEMS, 'sidebar__menu')
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
