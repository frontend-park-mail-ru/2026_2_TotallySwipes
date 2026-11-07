import type { Photo } from '../../api/api.types.js';
import { PHOTO_PLACEHOLDER, icons } from '../../icons.js';
import { PhotoQueue } from '../../photos/photo-queue.js';
import { initPhotoDrag } from '../../photos/photo-drag.js';
import { getElement } from '../../utils/dom.js';
import { PHOTO_MAX_COUNT, PHOTO_TYPES } from '../../validation.js';
import { setFormFieldError } from '../form-field/form-field.js';
import galleryHbs from './gallery.hbs';
import profilePhotosHbs from './profile-photos.hbs';

/**
 * Рендерит блок "Фото профиля": карточку с большим фото, миниатюрами и кнопками.
 * Содержимое появляется после {@link initProfilePhotos}.
 *
 * @returns HTML-строка карточки.
 */
export function profilePhotosTemplate(): string {
    return profilePhotosHbs({ accept: PHOTO_TYPES.join(',') });
}

/**
 * Параметры блока "Фото профиля".
 */
export interface ProfilePhotosOptions {
    /** Фото анкеты по порядку, первое -- главное. */
    photos: Photo[];
    /** Вызывается, когда все действия с фото завершились, успешно или нет. */
    onSettled?: () => void;
}

/**
 * Включает блок "Фото профиля". Каждое действие сразу уходит на бэкенд: загрузка при выборе
 * файла, замена, удаление и перестановка перетаскиванием. Пока действия не завершились,
 * фото заблокированы.
 *
 * @param root - Карточка из {@link profilePhotosTemplate}.
 * @param options - Параметры блока.
 */
export function initProfilePhotos(
    root: HTMLElement,
    { photos, onSettled }: ProfilePhotosOptions,
): void {
    const queue = new PhotoQueue(photos);
    const gallery = getElement(root, '.profile-photos__gallery');
    const count = getElement(root, '.profile-photos__count');
    const fileInput = getElement<HTMLInputElement>(root, '.profile-photos__file');
    const replaceInput = getElement<HTMLInputElement>(root, '.profile-photos__replace-file');

    // Выбранное фото запоминается по id, чтобы оно не потерялось при перестановке.
    // Индекс нужен, когда выбранное фото исчезло -- выбирается соседнее.
    let selectedId: number | null = null;
    let selectedIndex = 0;

    queue.subscribe({
        onChange() {
            if (!root.isConnected) return;

            render();

            if (!queue.isSaving) {
                onSettled?.();
            }
        },
        onError(message) {
            setFormFieldError(fileInput, message);
        },
    });

    render();

    root.addEventListener('click', (event) => {
        if (!(event.target instanceof Element)) {
            return;
        }

        const filled = event.target.closest<HTMLElement>('.profile-photos__thumb_filled');

        if (filled) {
            selectedId = queue.photos[Number(filled.dataset.index)]?.id ?? null;
            render();
        } else if (event.target.closest('.profile-photos__thumb_empty')) {
            fileInput.click();
        } else if (event.target.closest('.profile-photos__replace')) {
            replaceInput.click();
        } else if (event.target.closest('.profile-photos__remove') && selectedId !== null) {
            setFormFieldError(fileInput, null);
            queue.remove(selectedId);
        }
    });

    initPhotoDrag(root, {
        slotSelector: '.profile-photos__thumb_filled',
        draggingClass: 'profile-photos__thumb_dragging',
        dropTargetClass: 'profile-photos__thumb_drop-target',
        onMove(from, to) {
            setFormFieldError(fileInput, null);
            queue.move(from, to);
        },
    });

    fileInput.addEventListener('change', () => {
        const files = [...(fileInput.files ?? [])];

        fileInput.value = '';
        setFormFieldError(fileInput, null);

        files.forEach((file) => queue.upload(file));
    });

    replaceInput.addEventListener('change', () => {
        const file = replaceInput.files?.[0];

        replaceInput.value = '';
        setFormFieldError(fileInput, null);

        if (!file) {
            return;
        }

        if (selectedId === null) {
            queue.upload(file);
        } else {
            queue.replace(selectedId, file);
        }
    });

    /**
     * Перерисовывает фото и счётчик по текущему списку.
     */
    function render() {
        const list = queue.photos;
        const foundIndex = list.findIndex((photo) => photo.id === selectedId);

        selectedIndex =
            foundIndex === -1 ? Math.min(selectedIndex, Math.max(list.length - 1, 0)) : foundIndex;
        selectedId = list[selectedIndex]?.id ?? null;

        const slots = Array.from({ length: PHOTO_MAX_COUNT }, (_, index) => {
            const photo = list[index];

            return photo
                ? { index, url: photo.url, number: index + 1, active: index === selectedIndex }
                : { index };
        });

        gallery.innerHTML = galleryHbs({
            main: list[selectedIndex]?.url ?? PHOTO_PLACEHOLDER,
            isMain: list.length > 0 && selectedIndex === 0,
            // Единственное фото заполненной анкеты удалить нельзя.
            removeDisabled: list.length <= 1 || queue.isSaving,
            locked: queue.isSaving,
            slots,
            plusIcon: icons.plus,
        });
        count.textContent = `${list.length} из ${PHOTO_MAX_COUNT}`;
    }
}
