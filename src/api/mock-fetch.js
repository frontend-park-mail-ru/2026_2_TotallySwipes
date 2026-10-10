import { MOCK_ROUTES, checkAccess } from './mocks.js';

/**
 * Разбирает тело запроса для мок-обработчиков: FormData в объект, строку - как JSON.
 *
 * @param {FormData|string|undefined} body
 * @returns {Object|null}
 */
function parseBody(body) {
    if (body instanceof FormData) {
        return Object.fromEntries(body);
    }

    // TODO: Сделать валидацию JSON-а.
    return body ? JSON.parse(body) : null;
}

/**
 * Подмена fetch для работы без бэкенда: отвечает по таблице MOCK_ROUTES.
 *
 * @param {string} url
 * @param {RequestInit} [options]
 * @returns {Promise<Response>}
 */
export async function mockFetch(url, options = {}) {
    const method = (options.method ?? 'GET').toUpperCase();
    const parsedUrl = new URL(url, location.origin);

    const denied = checkAccess(parsedUrl.pathname);
    if (denied) {
        return jsonResponse(denied.body, denied.status);
    }

    const route =
        MOCK_ROUTES[`${method} ${parsedUrl.pathname}`] ??
        MOCK_ROUTES[`${method} ${parsedUrl.pathname.replace(/\/\d+$/, '/{id}')}`];
    if (!route) {
        return jsonResponse({ error: { code: 'NOT_FOUND', message: 'Not found' } }, 404);
    }

    const mock =
        typeof route === 'function'
            ? route(parsedUrl, { ...options, body: parseBody(options.body) })
            : route;

    return jsonResponse(mock.body, mock.status);
}

/**
 * @param {*} body
 * @param {number} status
 * @returns {Response} JSON-ответ, при статусе 204 - без тела.
 */
function jsonResponse(body, status) {
    if (status === 204) {
        return new Response(null, { status });
    }

    return new Response(JSON.stringify(body), {
        status,
        headers: { 'Content-Type': 'application/json' },
    });
}
