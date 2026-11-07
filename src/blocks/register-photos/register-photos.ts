import { setFormFieldError, validateFormFields } from '../form-field/form-field.js';
import { PHOTO_MAX_COUNT, PHOTO_TYPES, validatePhotoCount } from '../../validation.js';
import type { Photo } from '../../api/api.types.js';
import { icons } from '../../icons.js';
import { getElement } from '../../utils/dom.js';
import { PhotoQueue } from '../../photos/photo-queue.js';
import { initPhotoDrag } from '../../photos/photo-drag.js';
import type { RegisterData, RegisterStepLogic } from '../register-form/register-form.js';
import gridHbs from './grid.hbs';
import registerPhotosHbs from './register-photos.hbs';

/**
 * Данные шагов с инициализированной очередью фото.
 */
type PhotosData = RegisterData & Required<Pick<RegisterData, 'photoQueue'>>;

/**
 * Рендерит сетку фото.
 *
 * @param photos - Фото по порядку, первое главное.
 * @param locked - Идёт сохранение: удалять, добавлять и переставлять фото нельзя.
 * @returns HTML-строка сетки из PHOTO_MAX_COUNT слотов.
 */
function gridTemplate(photos: readonly Photo[], locked: boolean): string {
    const slots = Array.from({ length: PHOTO_MAX_COUNT }, (_, index) => {
        const photo = photos[index];

        return photo ? { index, id: photo.id, url: photo.url, main: index === 0 } : { index };
    });

    return gridHbs({
        slots,
        locked,
        plusIcon: icons.plus,
        closeIcon: icons.close,
    });
}

/**
 * Создаёт очередь фото в данных шагов, если её ещё нет.
 *
 * @param data - Данные шагов.
 */
function initPhotosData(data: RegisterData): asserts data is PhotosData {
    data.photoQueue ??= new PhotoQueue();
}

/**
 * Шаг регистрации: фото. Каждое действие сразу уходит на бэкенд: загрузка при выборе,
 * удаление и перестановка перетаскиванием. Действия выполняются по очереди. Пока есть
 * незавершённые, сетка заблокирована, чтобы следующее действие строилось по актуальному
 * списку фото.
 */
export const photosStep: RegisterStepLogic = {
    template(data) {
        return registerPhotosHbs({
            accept: PHOTO_TYPES.join(','),
            grid: gridTemplate(data.photoQueue?.photos ?? [], data.photoQueue?.isSaving ?? false),
        });
    },

    init(form, data) {
        initPhotosData(data);

        const queue = data.photoQueue;
        const fileInput = getElement<HTMLInputElement>(form, '.register-photos__file');

        // Вернулись на шаг во время сохранения: слушатель заменяется на эту форму,
        // и очередь перерисует сетку, когда действия завершатся.
        queue.subscribe({
            onChange() {
                if (form.isConnected) {
                    getElement(form, '.register-photos__grid').outerHTML = gridTemplate(
                        queue.photos,
                        queue.isSaving,
                    );
                }
            },
            onError(message) {
                setFormFieldError(fileInput, message);
            },
        });

        form.addEventListener('click', (event) => {
            if (!(event.target instanceof Element)) {
                return;
            }

            const removeButton = event.target.closest<HTMLElement>('.register-photos__remove');

            if (removeButton) {
                setFormFieldError(fileInput, null);
                queue.remove(Number(removeButton.dataset.id));
            } else if (event.target.closest('.register-photos__slot_empty')) {
                fileInput.click();
            }
        });

        initPhotoDrag(form, {
            slotSelector: '.register-photos__slot_filled',
            draggingClass: 'register-photos__slot_dragging',
            dropTargetClass: 'register-photos__slot_drop-target',
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
    },

    async validate(form, data) {
        initPhotosData(data);
        await data.photoQueue.idle;

        const fileInput = getElement<HTMLInputElement>(form, '.register-photos__file');

        return validateFormFields([
            {
                input: fileInput,
                validate: () => validatePhotoCount(data.photoQueue.photos.length),
            },
        ]);
    },
};
