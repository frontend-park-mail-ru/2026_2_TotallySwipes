import menuHbs from './menu.hbs';

export interface MenuItem {
    href: string;
    text: string;
    icon: string;
    counter?: number;
    disabled?: boolean;
}

/**
 * @param {{href: string, text: string, icon: string, counter?: number, disabled?: boolean}[]} items
 * @param {string} [mix]
 * @returns {string}
 */
export function menuTemplate(items: MenuItem[], mix: string = ''): string {
    return menuHbs({ items, mix });
}

/**
 * Подсвечивает пункт меню текущей страницы, включая вложенные пути.
 *
 * @param {string} pathname
 */
export function setActiveMenuLink(pathname: string) {
    document.querySelectorAll('.menu__link').forEach((link) => {
        const href: string | null = link.getAttribute('href');
        const isActive = href === pathname || (href !== '/' && pathname.startsWith(`${href}/`));

        link.classList.toggle('menu__link_active', isActive);
    });
}
