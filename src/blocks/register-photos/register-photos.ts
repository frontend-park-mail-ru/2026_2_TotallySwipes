import { setFormFieldError, validateFormFields } from '../form-field/form-field.js';
import {
    PHOTO_MAX_COUNT,
    PHOTO_TYPES,
    validatePhotoFile,
    validatePhotoCount,
} from '../../validation.js';
import { uploadPhoto, deletePhoto, reorderPhotos, ApiError } from '../../api/api.js';
import type { Photo, PhotosResponse } from '../../api/api.types.js';
import { icons } from '../../icons.js';
import { getElement } from '../../utils/dom.js';
import type { RegisterData, RegisterStepLogic } from '../register-form/register-form.js';
import gridHbs from './grid.hbs';
import registerPhotosHbs from './register-photos.hbs';

/**
 * Данные шагов с инициализированными служебными полями шага с фото.
 */
type PhotosData = RegisterData &
    Required<Pick<RegisterData, 'photos' | 'photosPending' | 'photosSaving'>>;

const NETWORK_ERROR_MESSAGE =
    'Не удалось сохранить фото. Проверьте соединение и попробуйте ещё раз.';

/**
 * Рендерит сетку фото.
 *
 * @param photos - Фото по порядку, первое главное.
 * @param locked - Идёт сохранение: удалять, добавлять и переставлять фото нельзя.
 * @returns HTML-строка сетки из PHOTO_MAX_COUNT слотов.
 */
function gridTemplate(photos: Photo[], locked: boolean): string {
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
 * Выбирает текст ошибки фото: первая причина бэкенда для ошибок 4xx, иначе общее сообщение.
 *
 * @param error - Ошибка действия с фото.
 * @returns Текст ошибки для пользователя.
 */
function photoErrorMessage(error: unknown): string {
    if (error instanceof ApiError && error.status < 500) {
        return Object.values(error.fields ?? {})[0] ?? error.message;
    }

    return NETWORK_ERROR_MESSAGE;
}

/**
 * Переносит id с одной позиции на другую.
 *
 * @param ids - Исходный порядок.
 * @param from - Позиция, с которой переносят.
 * @param to - Позиция, на которую переносят.
 * @returns Новый порядок, исходный массив не меняется.
 */
function moveId(ids: number[], from: number, to: number): number[] {
    const result = [...ids];
    const [moved] = result.splice(from, 1);
    result.splice(to, 0, moved);

    return result;
}

/**
 * Включает перестановку фото перетаскиванием. Слушатели висят на form,
 * поэтому переживают перерисовку сетки.
 *
 * @param form - Форма шага.
 * @param onMove - Получает позиции from и to.
 */
function initPhotoDrag(form: HTMLFormElement, onMove: (from: number, to: number) => void) {
    let from: number | null = null;

    const slotOf = (event: Event) =>
        event.target instanceof Element
            ? event.target.closest<HTMLElement>('.register-photos__slot_filled')
            : null;
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
        if (event.dataTransfer) {
            event.dataTransfer.effectAllowed = 'move';
        }
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
        const start = from;
        const to = Number(slot.dataset.index);

        // onMove перерисовывает сетку, и dragend удалённого слота до form уже не дойдёт.
        from = null;
        if (to !== start) {
            onMove(start, to);
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
 * Задаёт начальные значения служебных полей шага, если их ещё нет.
 *
 * @param data - Данные шагов.
 */
function initPhotosData(data: RegisterData): asserts data is PhotosData {
    data.photos ??= [];
    data.photosPending ??= Promise.resolve();
    data.photosSaving ??= 0;
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
            grid: gridTemplate(data.photos ?? [], (data.photosSaving ?? 0) > 0),
        });
    },

    init(form, data) {
        initPhotosData(data);

        const fileInput = getElement<HTMLInputElement>(form, '.register-photos__file');
        const renderGrid = () => {
            getElement(form, '.register-photos__grid').outerHTML = gridTemplate(
                data.photos,
                data.photosSaving > 0,
            );
        };

        /**
         * Ставит действие с фото в очередь.
         *
         * @param action - Запрос, меняющий фото. Возвращает ответ API со списком фото
         *     или `null`, если запрос не понадобился.
         */
        const enqueue = (action: () => Promise<PhotosResponse | null>) => {
            data.photosSaving += 1;
            renderGrid();

            data.photosPending = data.photosPending.then(async () => {
                try {
                    const response = await action();
                    if (response) {
                        data.photos = response.photos;
                    }
                } catch (error) {
                    setFormFieldError(fileInput, photoErrorMessage(error));
                }

                data.photosSaving -= 1;
                if (form.isConnected) {
                    renderGrid();
                }
            });
        };

        // Вернулись на шаг во время сохранения: очередь перерисует старую форму, а эту - здесь.
        if (data.photosSaving > 0) {
            data.photosPending.then(() => {
                if (form.isConnected) {
                    renderGrid();
                }
            });
        }

        form.addEventListener('click', (event) => {
            if (!(event.target instanceof Element)) {
                return;
            }

            const removeButton = event.target.closest<HTMLElement>('.register-photos__remove');

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
            const files = [...(fileInput.files ?? [])];

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
        initPhotosData(data);
        await data.photosPending;

        const fileInput = getElement<HTMLInputElement>(form, '.register-photos__file');

        return validateFormFields([
            { input: fileInput, validate: () => validatePhotoCount(data.photos.length) },
        ]);
    },
};
