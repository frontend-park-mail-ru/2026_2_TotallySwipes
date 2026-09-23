export function menuTemplate(items, mix = '') {
    const itemsHtml = items.map((item) => `
        <li class="menu__item">
            <a class="menu__link" href="${item.href}" data-link>
                <span class="menu__icon">${item.icon}</span>
                <span class="menu__text">${item.text}</span>
                ${item.counter ? `<span class="counter menu__counter">${item.counter}</span>` : ''}
            </a>
        </li>
    `).join('');

    return `<ul class="menu ${mix}">${itemsHtml}</ul>`;
}

export function setActiveMenuLink(pathname) {
    document.querySelectorAll('.menu__link').forEach((link) => {
        link.classList.toggle('menu__link_active', link.getAttribute('href') === pathname);
    });
}
