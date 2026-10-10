import { setFormFieldError, validateFormFields } from '../form-field/form-field.js';
import {
    PHOTO_MAX_COUNT,
    PHOTO_TYPES,
    validatePhotoFile,
    validatePhotoCount,
} from '../../validation.js';
import { uploadPhoto, deletePhoto, reorderPhotos, ApiError } from '../../api/api.js';
import { icons } from '../../icons.js';

const NETWORK_ERROR_MESSAGE =
    'Не удалось сохранить фото. Проверьте соединение и попробуйте ещё раз.';

/**
 * @param {{id: number, url: string}[]} photos
 * @returns {string} HTML сетки из PHOTO_MAX_COUNT слотов.
 */
function gridTemplate(photos) {
    const slots = Array.from({ length: PHOTO_MAX_COUNT }, (_, index) => {
        const photo = photos[index];

        return photo ? { index, id: photo.id, url: photo.url, main: index === 0 } : { index };
    });

    return Handlebars.templates['register-photos/grid']({
        slots,
        plusIcon: icons.plus,
        closeIcon: icons.close,
    });
}

/**
 * @param {*} error
 * @returns {string} Причина ошибки бэкенда или общее сообщение.
 */
function photoErrorMessage(error) {
    if (error instanceof ApiError && error.status < 500) {
        return Object.values(error.fields ?? {})[0] ?? error.message;
    }

    return NETWORK_ERROR_MESSAGE;
}

/**
 * @param {number[]} ids
 * @param {number} from
 * @param {number} to
 * @returns {number[]} Новый порядок: id с позиции from перенесён на позицию to.
 */
function moveId(ids, from, to) {
    const result = [...ids];
    const [moved] = result.splice(from, 1);
    result.splice(to, 0, moved);

    return result;
}

/**
 * Включает перестановку фото перетаскиванием. Слушатели висят на form,
 * поэтому переживают перерисовку сетки.
 *
 * @param {HTMLFormElement} form
 * @param {function(number, number): void} onMove - Получает позиции from и to.
 */
function initPhotoDrag(form, onMove) {
    let from = null;

    const slotOf = (event) => event.target.closest('.register-photos__slot_filled');
    const clearTargets = () => {
        form.querySelectorAll('.register-photos__slot_drop-target').forEach((slot) => {
            slot.classList.remove('register-photos__slot_drop-target');
        });
    };

    form.addEventListener('dragstart', (event) => {
        const slot = slotOf(event);
        if (!slot) {
            return;
        }

        from = Number(slot.dataset.index);
        event.dataTransfer.effectAllowed = 'move';
        slot.classList.add('register-photos__slot_dragging');
    });

    form.addEventListener('dragover', (event) => {
        const slot = slotOf(event);
        if (from === null || !slot) {
            return;
        }

        event.preventDefault();
        clearTargets();
        if (Number(slot.dataset.index) !== from) {
            slot.classList.add('register-photos__slot_drop-target');
        }
    });

    form.addEventListener('drop', (event) => {
        const slot = slotOf(event);
        if (from === null || !slot) {
            return;
        }

        event.preventDefault();
        const to = Number(slot.dataset.index);
        if (to !== from) {
            onMove(from, to);
        }
    });

    form.addEventListener('dragend', () => {
        from = null;
        clearTargets();
        form.querySelector('.register-photos__slot_dragging')?.classList.remove(
            'register-photos__slot_dragging',
        );
    });
}

/**
 * Шаг 4: фото. Каждое действие сразу уходит на бэкенд: загрузка при выборе, удаление
 * и перестановка перетаскиванием. Действия выполняются по очереди в data.photosPending.
 * Сохраняет в data: photos - актуальный список фото с бэкенда, первое главное.
 */
export const photosStep = {
    template(data) {
        return Handlebars.templates['register-photos/register-photos']({
            accept: PHOTO_TYPES.join(','),
            grid: gridTemplate(data.photos ?? []),
        });
    },

    init(form, data) {
        data.photos ??= [];
        data.photosPending ??= Promise.resolve();

        const fileInput = form.querySelector('.register-photos__file');
        const renderGrid = () => {
            form.querySelector('.register-photos__grid').outerHTML = gridTemplate(data.photos);
        };

        /**
         * Ставит действие в очередь. action возвращает ответ API со списком фото
         * или null, если запрос не понадобился.
         *
         * @param {function(): Promise<?{photos: Object[]}>} action
         */
        const enqueue = (action) => {
            data.photosPending = data.photosPending.then(async () => {
                try {
                    const response = await action();
                    if (response) {
                        data.photos = response.photos;
                    }
                } catch (error) {
                    setFormFieldError(fileInput, photoErrorMessage(error));
                }

                if (form.isConnected) {
                    renderGrid();
                }
            });
        };

        form.addEventListener('click', (event) => {
            const removeButton = event.target.closest('.register-photos__remove');

            if (removeButton) {
                setFormFieldError(fileInput, null);
                enqueue(() => deletePhoto(Number(removeButton.dataset.id)));
            } else if (event.target.closest('.register-photos__slot_empty')) {
                fileInput.click();
            }
        });

        initPhotoDrag(form, (from, to) => {
            setFormFieldError(fileInput, null);
            enqueue(() =>
                reorderPhotos(
                    moveId(
                        data.photos.map((photo) => photo.id),
                        from,
                        to,
                    ),
                ),
            );
        });

        fileInput.addEventListener('change', () => {
            const files = [...fileInput.files];

            fileInput.value = '';
            setFormFieldError(fileInput, null);

            files.forEach((file) => {
                enqueue(async () => {
                    const error =
                        validatePhotoCount(data.photos.length + 1) ?? validatePhotoFile(file);

                    if (error) {
                        setFormFieldError(fileInput, error);
                        return null;
                    }

                    return uploadPhoto(file);
                });
            });
        });
    },

    async validate(form, data) {
        await data.photosPending;

        const fileInput = form.querySelector('.register-photos__file');

        return validateFormFields([
            { input: fileInput, validate: () => validatePhotoCount(data.photos.length) },
        ]);
    },
};
