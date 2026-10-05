import { refreshSession, ApiError } from './api/api.js';

let authenticated = false;

/**
 * @returns {boolean} Вошёл ли пользователь.
 */
export function isAuthenticated() {
    return authenticated;
}

/**
 * @param {boolean} value
 */
export function setAuthenticated(value) {
    authenticated = value;
}

/**
 * Проверяет сессию через refresh. 401 означает, что пользователь не вошёл.
 *
 * @returns {Promise<boolean>} Вошёл ли пользователь.
 * @throws {Error} При любой ошибке, кроме 401.
 */
export async function restoreSession() {
    try {
        await refreshSession();
        authenticated = true;
    } catch (error) {
        if (!(error instanceof ApiError && error.status === 401)) {
            throw error;
        }

        authenticated = false;
    }

    return authenticated;
}
