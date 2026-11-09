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
 * Словарь страниц, для которых нужно подсветить в меню не их собственный раздел, а какой-то другой.
 * Формат словаря: Префикс страницы -> href пункта меню.
 */
const MENU_PATH_ALIASES: Record<string, string> = { '/profile/': '/matches' };

/**
 * Подсвечивает пункт меню текущей страницы, включая вложенные пути.
 *
 * @param {string} pathname
 */
export function setActiveMenuLink(pathname: string) {
    const current =
        Object.entries(MENU_PATH_ALIASES).find(([prefix]) => pathname.startsWith(prefix))?.[1] ??
        pathname;

    document.querySelectorAll('.menu__link').forEach((link) => {
        const href: string | null = link.getAttribute('href');
        const isActive = href === current || (href !== '/' && current.startsWith(`${href}/`));

        link.classList.toggle('menu__link_active', isActive);
    });
}
