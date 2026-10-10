import { mockFetch } from './mock-fetch.js';

const USE_MOCKS = false;
const API_URL = 'http://161.104.105.207:8080/api/v1';

// TODO: раскомментировать при добавлении свайпа на бек
// const SWIPE_ACTIONS = {
//     like: 'like',
//     dislike: 'dislike',
//     super: 'like',
// };

/**
 * Ошибка ответа API с HTTP-статусом и кодом ошибки бэкенда.
 */
export class ApiError extends Error {
    /**
     * @param {number} status - HTTP-статус ответа.
     * @param {string} code - Код ошибки из ответа бэкенда.
     * @param {string} message - Текст ошибки для пользователя.
     * @param {Object<string, string>|null} [fields] - Ошибки по отдельным полям формы.
     */
    constructor(status, code, message, fields = null) {
        super(message);
        this.name = 'ApiError';
        this.status = status;
        this.code = code;
        this.fields = fields;
    }
}

/**
 * Собирает полный URL запроса, пропуская пустые query-параметры.
 *
 * @param {string} path - Путь относительно API_URL.
 * @param {Object<string, *>} [query] - Query-параметры.
 * @returns {string}
 */
function buildUrl(path, query = {}) {
    const params = new URLSearchParams();

    for (const [key, value] of Object.entries(query)) {
        if (value !== undefined && value !== null) {
            params.set(key, value);
        }
    }

    const search = params.toString();
    return `${API_URL}${path}${search ? `?${search}` : ''}`;
}

let refreshPromise = null;
let handleUnauthorized = () => {};

/**
 * Задаёт обработчик, который вызывается, когда сессию не удалось обновить.
 *
 * @param {Function} callback
 */
export function onUnauthorized(callback) {
    handleUnauthorized = callback;
}

/**
 * Обновляет сессию. Параллельные вызовы ждут один и тот же запрос.
 *
 * @returns {Promise<*>}
 */
function refreshOnce() {
    refreshPromise ??= send('/auth/refresh', { method: 'POST' }).finally(() => {
        refreshPromise = null;
    });

    return refreshPromise;
}

/**
 * @param {*} error
 * @returns {boolean} true, если это ApiError со статусом 401.
 */
function isUnauthorized(error) {
    return error instanceof ApiError && error.status === 401;
}

/**
 * Отправляет запрос к API. При 401 один раз обновляет сессию и повторяет запрос.
 *
 * @param {string} path - Путь относительно API_URL.
 * @param {Object} [options] - Параметры запроса, как у send.
 * @returns {Promise<*>} Тело ответа.
 * @throws {ApiError}
 */
async function request(path, options = {}) {
    try {
        return await send(path, options);
    } catch (error) {
        if (!isUnauthorized(error) || path.startsWith('/auth/')) {
            throw error;
        }
    }

    try {
        await refreshOnce();
    } catch (error) {
        if (isUnauthorized(error)) {
            handleUnauthorized();
        }

        throw error;
    }

    return send(path, options);
}

/**
 * Отправляет один запрос без повторов. FormData уходит как есть, остальное тело - как JSON.
 *
 * @param {string} path - Путь относительно API_URL.
 * @param {Object} [options]
 * @param {string} [options.method='GET']
 * @param {Object<string, *>} [options.query] - Query-параметры.
 * @param {Object|FormData} [options.body] - Тело запроса.
 * @returns {Promise<*>} Тело ответа или null при статусе 204.
 * @throws {ApiError} Если ответ не 2xx.
 */
async function send(path, { method = 'GET', query, body } = {}) {
    const url = buildUrl(path, query);
    const init = { method, credentials: 'include' };

    if (body instanceof FormData) {
        init.body = body;
    } else if (body !== undefined) {
        init.headers = { 'Content-Type': 'application/json' };
        init.body = JSON.stringify(body);
    }

    const response = USE_MOCKS ? await mockFetch(url, init) : await fetch(url, init);

    if (response.status === 204) {
        return null;
    }

    const data = await response.json().catch(() => null);

    if (!response.ok) {
        throw new ApiError(
            response.status,
            data?.error?.code ?? 'UNKNOWN_ERROR',
            data?.error?.message ?? `${method} ${url} — ${response.status}`,
            data?.error?.fields ?? null,
        );
    }

    return data;
}

/**
 * Переводит кириллический домен почты в punycode, локальную часть не трогает.
 *
 * @param {string} email
 * @returns {string}
 */
function toAsciiEmail(email) {
    const value = email.trim().normalize('NFC');
    const atIdx = value.lastIndexOf('@');
    const domain = value.slice(atIdx + 1);

    if (atIdx === -1 || !/\P{ASCII}/u.test(domain)) {
        return value;
    }

    try {
        return `${value.slice(0, atIdx + 1)}${new URL(`http://${domain}`).hostname}`;
    } catch {
        return value;
    }
}

/**
 * Входит в аккаунт по почте и паролю.
 *
 * @param {string} email
 * @param {string} password
 * @returns {Promise<*>}
 */
export function login(email, password) {
    return request('/auth/login', {
        method: 'POST',
        body: { email: toAsciiEmail(email), password: password.normalize('NFC') },
    });
}

/**
 * Создаёт аккаунт с пустой анкетой и открывает сессию.
 *
 * @param {string} email
 * @param {string} password
 * @returns {Promise<{user_id: number, missing: string[]}>}
 * @throws {ApiError} Со статусом 409, если почта уже занята.
 */
export function register(email, password) {
    return request('/auth/register', {
        method: 'POST',
        body: { email: toAsciiEmail(email), password: password.normalize('NFC') },
    });
}

/**
 * Меняет присланные поля анкеты, остальные остаются как были.
 *
 * @param {Object} fields - Поля в формате API: name, birth_date, sex, dating_goal, tags и т. д.
 * @returns {Promise<Object>} Анкета после изменения.
 */
export function updateProfile(fields) {
    return request('/profile/me', { method: 'PATCH', body: fields });
}

/**
 * Задаёт фильтр ленты целиком.
 *
 * @param {Object} filter
 * @param {string} filter.sex - male, female или all.
 * @param {number} filter.age_from
 * @param {number} filter.age_to
 * @returns {Promise<Object>} Сохранённый фильтр.
 */
export function setSearchFilter(filter) {
    return request('/filters/me', { method: 'PUT', body: filter });
}

/**
 * Загружает одно фото в конец списка фото анкеты.
 *
 * @param {File} file
 * @returns {Promise<{photos: {id: number, url: string}[]}>} Актуальный список фото.
 */
export function uploadPhoto(file) {
    const form = new FormData();
    form.append('photo', file);

    return request('/profile/me/photos', { method: 'POST', body: form });
}

/**
 * Удаляет фото анкеты.
 *
 * @param {number} photoId
 * @returns {Promise<{photos: {id: number, url: string}[]}>} Актуальный список фото.
 */
export function deletePhoto(photoId) {
    return request(`/profile/me/photos/${photoId}`, { method: 'DELETE' });
}

/**
 * Задаёт порядок фото анкеты, первое становится главным.
 *
 * @param {number[]} photoIds - id всех фото анкеты, каждый ровно один раз.
 * @returns {Promise<{photos: {id: number, url: string}[]}>} Актуальный список фото.
 * @throws {ApiError} Со статусом 400, если набор id не совпадает с фото анкеты.
 */
export function reorderPhotos(photoIds) {
    return request('/profile/me/photos/order', { method: 'PUT', body: { photo_ids: photoIds } });
}

/**
 * Завершает сессию на сервере.
 *
 * @returns {Promise<null>}
 */
export function logout() {
    return request('/auth/logout', { method: 'POST' });
}

/**
 * Обновляет сессию по refresh-токену.
 *
 * @returns {Promise<*>}
 */
export function refreshSession() {
    return refreshOnce();
}

/**
 * Загружает краткий профиль текущего пользователя.
 *
 * @returns {Promise<Object>}
 */
export function getCurrentUser() {
    return request('/profile/me/short');
}

/**
 * Загружает страницу ленты анкет.
 *
 * @param {Object} [params]
 * @param {number} [params.limit=10] - Сколько анкет вернуть.
 * @param {string} [params.cursor] - Курсор следующей страницы.
 * @returns {Promise<{items: Object[], next_cursor: string|null}>}
 */
export function getFeed({ limit = 10, cursor } = {}) {
    return request('/feed', { query: { limit, cursor } });
}

/**
 * Загружает актуальный тест совместимости.
 *
 * @returns {Promise<Object>}
 */
export function getCurrentTest() {
    return request('/tests/current');
}

/**
 * Загружает результат теста текущего пользователя.
 *
 * @returns {Promise<Object>}
 * @throws {ApiError} Со статусом 404, если тест ещё не пройден.
 */
export function getMyTestResult() {
    return request('/tests/results/me');
}

/**
 * Отправляет ответы на тест.
 *
 * @param {number|string} testId
 * @param {{question_id: number, value: number}[]} answers
 * @returns {Promise<Object>} Результат теста.
 */
export function sendTestResults(testId, answers) {
    return request(`/tests/${testId}/results`, {
        method: 'POST',
        body: { answers },
    });
}

/**
 * Заглушка отправки свайпа, пока на бэкенде нет ручки.
 *
 * @returns {Promise<void>}
 */
export function sendSwipe() {
    return Promise.resolve();
}

// export function sendSwipe(targetUserId, direction) {
//     return request('/feed/swipe', {
//         method: 'POST',
//         body: { target_user_id: targetUserId, action: SWIPE_ACTIONS[direction] },
//     });
// }
