import { getElement } from '../../utils/dom.js';
import type { AccentColor } from '../../colors.js';
import { initPhotoSwipe } from '../../photos/photo-swipe.js';
import { changeCurrentPager, pagerTemplate } from '../pager/pager.js';
import photoGalleryHbs from './photo-gallery.hbs';

/**
 * Стикер совместимости поверх фото (виден на мобилке).
 */
export interface PhotoGalleryStamp {
    /** Процент совместимости. */
    value: number;
    /** Цвет стикера. */
    color: AccentColor;
}

/**
 * Свойства блока "Галерея фото" для рендеринга.
 */
export interface PhotoGalleryProps {
    /** Адреса фото по порядку, первое показывается сразу. Не меньше одного. */
    photos: string[];
    /** Стикер совместимости. Если не передан, стикера нет. */
    stamp?: PhotoGalleryStamp;
    /** Дополнительные CSS-классы (БЭМ-микс). */
    mix?: string;
}

/**
 * Рендерит блок "Галерея фото": заголовок со счётчиком, большое фото и миниатюры.
 * Если фото одно, счётчика, полосок и миниатюр нет. Полоски и стикер показываются
 * только на мобилке, там же вместо миниатюр фото листаются тапом по краям.
 *
 * @param props - Свойства для рендеринга галереи.
 * @returns HTML-строка галереи.
 */
export function photoGalleryTemplate({ photos, stamp, mix = '' }: PhotoGalleryProps): string {
    const thumbs =
        photos.length > 1 ? photos.map((src, index) => ({ src, active: index === 0 })) : null;

    return photoGalleryHbs({
        mix,
        main: photos[0],
        total: photos.length,
        thumbs,
        pager: thumbs ? pagerTemplate('photo-gallery__pager', 1, photos.length) : '',
        stamp: stamp
            ? `<div class="match-stamp match-stamp_color_${stamp.color} photo-gallery__stamp">
                <img class="match-stamp__image" src="/icons/badge-compat-${stamp.color}.svg" alt="" draggable="false">
                <span class="match-stamp__value">${stamp.value}%</span>
            </div>`
            : '',
    });
}

/**
 * Включает переключение фото по клику на миниатюру, а на мобилке, где миниатюр нет,
 * ещё и по тапу на левую или правую половину фото. Касанием фото листаются и свайпом.
 *
 * @param gallery - Корневой элемент галереи.
 */
export function initPhotoGallery(gallery: HTMLElement): void {
    const thumbsElement = gallery.querySelector('.photo-thumbs');

    if (!thumbsElement) {
        return;
    }

    const frame = getElement(gallery, '.photo-frame');
    const image = getElement<HTMLImageElement>(gallery, '.photo-frame__image');
    const counter = getElement(gallery, '.photo-gallery__counter');
    const pager = getElement(gallery, '.photo-gallery__pager');
    const thumbs = [...thumbsElement.querySelectorAll<HTMLButtonElement>('.photo-thumbs__item')];
    let current = 0;

    /**
     * Показывает фото с заданным номером и синхронизирует счётчик, полоски и миниатюры.
     *
     * @param index - Номер фото, начиная с нуля.
     */
    function show(index: number) {
        current = index;

        thumbs.forEach((item, itemIndex) => {
            item.classList.toggle('photo-thumbs__item_active', itemIndex === index);
        });

        image.src = getElement<HTMLImageElement>(thumbs[index], '.photo-thumbs__image').src;
        counter.textContent = `${index + 1} из ${thumbs.length}`;
        changeCurrentPager(pager, index);
    }

    /**
     * Листает фото на шаг вперёд или назад. После последнего идёт первое, перед первым последнее.
     *
     * @param step - 1 - следующее фото, -1 - предыдущее.
     */
    function showNext(step: 1 | -1) {
        show((current + step + thumbs.length) % thumbs.length);
    }

    thumbsElement.addEventListener('click', (event) => {
        const thumb =
            event.target instanceof Element
                ? event.target.closest<HTMLButtonElement>('.photo-thumbs__item')
                : null;

        if (thumb) {
            show(thumbs.indexOf(thumb));
        }
    });

    initPhotoSwipe(gallery, {
        frameSelector: '.photo-frame',
        onSwipe: showNext,
    });

    frame.addEventListener('click', (event) => {
        // Полоски видны только на мобилке: там и работает листание тапом.
        if (pager.offsetParent === null) {
            return;
        }

        const { left, width } = frame.getBoundingClientRect();
        showNext(event.clientX < left + width / 2 ? -1 : 1);
    });
}
