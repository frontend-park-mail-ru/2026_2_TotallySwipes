import {
    register,
    updateProfile,
    setSearchFilter,
    uploadPhoto,
    deletePhoto,
    reorderPhotos,
} from '../../../api/api.js';

/**
 * @typedef {Object} RegisterProgress
 * @property {boolean} registered - Аккаунт уже создан, повторно регистрироваться не нужно.
 * @property {Map<File, number>} photoIds - id фото на бэкенде для уже загруженных файлов.
 */

/**
 * @returns {RegisterProgress} Прогресс отправки до первой попытки.
 */
export function createRegisterProgress() {
    return { registered: false, photoIds: new Map() };
}

/**
 * Отправляет собранные на шагах данные: аккаунт, анкету, фильтр ленты и фото.
 * Прогресс сохраняется в progress, поэтому повтор после ошибки продолжает с места сбоя,
 * а анкета и фильтр отправляются заново с актуальными значениями.
 *
 * @param {Object} data - Данные шагов регистрации.
 * @param {RegisterProgress} progress - Изменяется на месте.
 * @returns {Promise<void>}
 * @throws {ApiError}
 */
export async function submitRegistration(data, progress) {
    if (!progress.registered) {
        await register(data.email, data.password);
        progress.registered = true;
    }

    await updateProfile({
        name: data.name,
        birth_date: data.birthDate,
        sex: data.sex,
        dating_goal: data.datingGoal,
        tags: data.interests ?? [],
    });

    await setSearchFilter({
        sex: data.searchSex,
        age_from: Number(data.searchAgeFrom),
        age_to: Number(data.searchAgeTo),
    });

    await syncPhotos(data.photos, progress.photoIds);
}

/**
 * Приводит фото анкеты к списку files: догружает новые, удаляет убранные и выставляет порядок.
 * Новые загружаются раньше удаления, чтобы у анкеты не пропадали все фото разом.
 *
 * @param {File[]} files - Фото в нужном порядке, первое главное.
 * @param {Map<File, number>} photoIds - Изменяется на месте.
 * @returns {Promise<void>}
 */
async function syncPhotos(files, photoIds) {
    let photos = null;

    for (const file of files) {
        if (!photoIds.has(file)) {
            ({ photos } = await uploadPhoto(file));
            photoIds.set(file, photos[photos.length - 1].id);
        }
    }

    for (const [file, id] of photoIds) {
        if (!files.includes(file)) {
            ({ photos } = await deletePhoto(id));
            photoIds.delete(file);
        }
    }

    const wanted = files.map((file) => photoIds.get(file));
    const inOrder = photos !== null && photos.every((photo, index) => photo.id === wanted[index]);

    if (!inOrder) {
        await reorderPhotos(wanted);
    }
}
