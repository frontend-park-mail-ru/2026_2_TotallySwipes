import { ApiError, getProfileById } from '../../api/api.js';
import type { MatchedProfile } from '../../api/api.types.js';
import { interestColor, interestIconUrl, interestLabel } from '../../interests.js';
import { getElement } from '../../utils/dom.js';
import { emptyStateTemplate, type EmptyStateData } from '../empty-state/empty-state.js';
import { toProfileView } from '../feed/feed.js';
import { locationTemplate } from '../location/location.js';
import { showModal } from '../modal/modal.js';
import { initPhotoGallery, photoGalleryTemplate } from '../photo-gallery/photo-gallery.js';
import { pillTemplate } from '../pill/pill.js';
import profileHbs from './profile.hbs';
import profileViewHbs from './profile-view.hbs';

//TODO: вынести в общие константы отсюда, из feed.ts и из matches.ts
const LOAD_ERROR_MODAL = {
    image: '/icons/mascot-error.svg',
    title: 'Произошла ошибка',
    text: 'Не удалось загрузить анкету, похоже, что пропала связь. Попробуйте ещё раз.',
    buttonText: 'Повторить',
};

// Сообщение для случая, когда бэкенд отвечает 404 или userId некорректен.
const NOT_FOUND_STATE: EmptyStateData = {
    image: '/icons/card-mascot-sky.svg',
    title: 'Анкета недоступна',
    text: 'Посмотреть анкету можно только при взаимной симпатии. Возможно, её уже нет.',
    size: 'l',
    actions: [{ text: 'К симпатиям', view: 'primary', href: '/matches' }],
};

/**
 * Рендерит блок анкеты собеседника.
 *
 * @param item - Анкета собеседника.
 * @returns HTML-строка галереи и карточек анкеты.
 */
function profileTemplate(item: MatchedProfile): string {
    const profile = toProfileView(item);

    return profileHbs({
        ...profile,
        gallery: photoGalleryTemplate({ photos: profile.imgPath }),
        location: profile.location
            ? locationTemplate('profile-view__location', profile.location)
            : '',
        tags: item.tags
            .map((tag) =>
                pillTemplate({
                    text: interestLabel(tag),
                    icon: interestIconUrl(tag),
                    color: interestColor(tag),
                    mix: 'profile-view__tag',
                }),
            )
            .join(''),
    });
}

/**
 * Рендерит страницу анкеты собеседника. Если анкета недоступна, показывает заглушку.
 * При любой другой ошибке предлагает повторить загрузку.
 *
 * @param root - Контейнер страницы.
 * @param userId - id владельца анкеты. Если это не положительное целое число, показывает заглушку.
 */
export function renderProfileViewPage(root: HTMLElement, userId: number) {
    root.innerHTML = profileViewHbs();

    const page = getElement(root, '.profile-view');
    const content = getElement(page, '.profile-view__content');

    if (Number.isInteger(userId) && userId > 0) {
        load();
    } else {
        showNotFound();
    }

    function showNotFound() {
        page.classList.add('profile-view_empty');
        content.innerHTML = emptyStateTemplate(NOT_FOUND_STATE);
    }

    function load() {
        getProfileById(userId)
            .then((item) => {
                if (!page.isConnected) return;

                content.innerHTML = profileTemplate(item);
                initPhotoGallery(getElement(content, '.photo-gallery'));
            })
            .catch((error) => {
                console.error('Не удалось загрузить анкету:', error);
                if (!page.isConnected) return;

                if (error instanceof ApiError && error.status === 404) {
                    showNotFound();
                    return;
                }

                showModal({ ...LOAD_ERROR_MODAL, onClose: load });
            });
    }
}
