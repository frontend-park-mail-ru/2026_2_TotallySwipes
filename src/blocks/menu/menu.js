export function menuTemplate(items, mix = '') {
    return Handlebars.templates['menu/menu']({ items, mix });
}

export function setActiveMenuLink(pathname) {
    document.querySelectorAll('.menu__link').forEach((link) => {
        link.classList.toggle('menu__link_active', link.getAttribute('href') === pathname);
    });
}
