import { escapeHtml } from '../../utils/escape-html.js';

export function userPreviewTemplate(user, mix = '') {
    const avatar = user.avatar
        ? `<img class="user-preview__avatar" src="${escapeHtml(user.avatar)}" alt="">`
        : `<span class="user-preview__avatar">${escapeHtml(user.name[0])}</span>`;

    return `
        <div class="user-preview ${mix}">
            ${avatar}
            <div class="user-preview__info">
                <span class="user-preview__name">${escapeHtml(user.name)}, ${escapeHtml(user.age)}</span>
                <span class="user-preview__city">${escapeHtml(user.city)}</span>
            </div>
        </div>
    `;
}
