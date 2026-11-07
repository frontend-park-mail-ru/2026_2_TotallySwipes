import { getElement } from '../../utils/dom.js';
import photoGalleryHbs from './photo-gallery.hbs';

/**
 * Свойства блока "Галерея фото" для рендеринга.
 */
export interface PhotoGalleryProps {
    /** Адреса фото по порядку, первое показывается сразу. Не меньше одного. */
    photos: string[];
    /** Дополнительные CSS-классы (БЭМ-микс). */
    mix?: string;
}

/**
 * Рендерит блок "Галерея фото": заголовок со счётчиком, большое фото и миниатюры.
 * Если фото одно, счётчика и миниатюр нет.
 *
 * @param props - Свойства для рендеринга галереи.
 * @returns HTML-строка галереи.
 */
export function photoGalleryTemplate({ photos, mix = '' }: PhotoGalleryProps): string {
    const thumbs =
        photos.length > 1 ? photos.map((src, index) => ({ src, active: index === 0 })) : null;

    return photoGalleryHbs({ mix, main: photos[0], total: photos.length, thumbs });
}

/**
 * Включает переключение фото по клику на миниатюру.
 *
 * @param gallery - Корневой элемент галереи.
 */
export function initPhotoGallery(gallery: HTMLElement): void {
    const thumbsElement = gallery.querySelector('.photo-gallery__thumbs');

    if (!thumbsElement) {
        return;
    }

    const image = getElement<HTMLImageElement>(gallery, '.photo-gallery__image');
    const counter = getElement(gallery, '.photo-gallery__counter');
    const thumbs = [...thumbsElement.querySelectorAll<HTMLButtonElement>('.photo-gallery__thumb')];

    thumbsElement.addEventListener('click', (event) => {
        const thumb =
            event.target instanceof Element
                ? event.target.closest<HTMLButtonElement>('.photo-gallery__thumb')
                : null;

        if (!thumb) {
            return;
        }

        thumbs.forEach((item) => {
            item.classList.toggle('photo-gallery__thumb_active', item === thumb);
        });

        image.src = getElement<HTMLImageElement>(thumb, '.photo-gallery__thumb-image').src;
        counter.textContent = `${thumbs.indexOf(thumb) + 1} из ${thumbs.length}`;
    });
}
