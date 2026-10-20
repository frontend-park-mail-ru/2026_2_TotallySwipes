import { getCurrentUser, ApiError } from './api/api.js';
import type { MissingField } from './api/api.types.js';

let authenticated = false;
let missing: MissingField[] = [];

/**
 * @returns {boolean} Вошёл ли пользователь.
 */
export function isAuthenticated() {
    return authenticated;
}

/**
 * @returns {boolean} Заполнены ли все обязательные поля анкеты. Пока нет -
 *     пользователя ведём на регистрацию дозаполнять анкету.
 */
export function isProfileComplete() {
    return missing.length === 0;
}

/**
 * @param {boolean} value
 * @param {string[]} [missingFields=[]] - Незаполненные поля анкеты из ответа бэкенда.
 */
export function setAuthenticated(value: boolean, missingFields: MissingField[] = []) {
    authenticated = value;
    missing = value ? missingFields : [];
}

/**
 * Проверяет сессию запросом краткой анкеты: при 401 api сам обновляет сессию через refresh.
 * Итоговый 401 означает, что пользователь не вошёл.
 *
 * @returns {Promise<boolean>} Вошёл ли пользователь.
 * @throws {Error} При любой ошибке, кроме 401.
 */
export async function restoreSession() {
    try {
        const user = await getCurrentUser();
        setAuthenticated(true, user.missing);
    } catch (error) {
        if (!(error instanceof ApiError && error.status === 401)) {
            throw error;
        }

        setAuthenticated(false);
    }

    return authenticated;
}
