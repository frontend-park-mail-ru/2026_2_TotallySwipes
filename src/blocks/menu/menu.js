/**
 * @param {{href: string, text: string, icon: string, counter?: number, disabled?: boolean}[]} items
 * @param {string} [mix]
 * @returns {string}
 */
export function menuTemplate(items, mix = '') {
    return Handlebars.templates['menu/menu']({ items, mix });
}

/**
 * Подсвечивает пункт меню текущей страницы, включая вложенные пути.
 *
 * @param {string} pathname
 */
export function setActiveMenuLink(pathname) {
    document.querySelectorAll('.menu__link').forEach((link) => {
        const href = link.getAttribute('href');
        const isActive = href === pathname || (href !== '/' && pathname.startsWith(`${href}/`));

        link.classList.toggle('menu__link_active', isActive);
    });
}
