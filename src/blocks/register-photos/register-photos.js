import { setFormFieldError, validateFormFields } from '../form-field/form-field.js';
import {
    PHOTO_MAX_COUNT,
    PHOTO_TYPES,
    validatePhotoFile,
    validatePhotoCount,
} from '../../validation.js';
import { icons } from '../../icons.js';

const previewUrls = new Map();

/**
 * @param {File} file
 * @returns {string} Object URL для превью, один на файл.
 */
function previewUrl(file) {
    if (!previewUrls.has(file)) {
        previewUrls.set(file, URL.createObjectURL(file));
    }

    return previewUrls.get(file);
}

/**
 * Освобождает Object URL превью.
 *
 * @param {File} file
 */
function releasePreview(file) {
    URL.revokeObjectURL(previewUrls.get(file));
    previewUrls.delete(file);
}

/**
 * @param {File[]} photos
 * @returns {string} HTML сетки из PHOTO_MAX_COUNT слотов.
 */
function gridTemplate(photos) {
    const slots = Array.from({ length: PHOTO_MAX_COUNT }, (_, index) => {
        const file = photos[index];

        return file ? { index, url: previewUrl(file), main: index === 0 } : { index };
    });

    return Handlebars.templates['register-photos/grid']({
        slots,
        plusIcon: icons.plus,
        closeIcon: icons.close,
    });
}

/**
 * Добавляет подходящие файлы в photos, пока не кончится лимит.
 *
 * @param {File[]} photos - Изменяется на месте.
 * @param {File[]} files
 * @returns {string|null} Последняя ошибка или null.
 */
function addPhotos(photos, files) {
    let error = null;

    for (const file of files) {
        const countError = validatePhotoCount(photos.length + 1);
        if (countError) {
            error = countError;
            break;
        }

        const fileError = validatePhotoFile(file);
        if (fileError) {
            error = fileError;
        } else {
            photos.push(file);
        }
    }

    return error;
}

/**
 * Шаг 4: фото. Сохраняет в data: photos - массив File.
 * Порядок задаёт порядок в анкете, первое фото главное.
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

        const fileInput = form.querySelector('.register-photos__file');
        const renderGrid = () => {
            form.querySelector('.register-photos__grid').outerHTML = gridTemplate(data.photos);
        };

        form.addEventListener('click', (event) => {
            const removeButton = event.target.closest('.register-photos__remove');

            if (removeButton) {
                const [removed] = data.photos.splice(Number(removeButton.dataset.index), 1);
                releasePreview(removed);
                setFormFieldError(fileInput, null);
                renderGrid();
            } else if (event.target.closest('.register-photos__slot_empty')) {
                fileInput.click();
            }
        });

        fileInput.addEventListener('change', () => {
            const error = addPhotos(data.photos, [...fileInput.files]);

            fileInput.value = '';
            setFormFieldError(fileInput, error);
            renderGrid();
        });
    },

    validate(form, data) {
        const fileInput = form.querySelector('.register-photos__file');

        return validateFormFields([
            { input: fileInput, validate: () => validatePhotoCount(data.photos.length) },
        ]);
    },
};
