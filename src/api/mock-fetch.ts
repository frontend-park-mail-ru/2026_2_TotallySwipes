import { installMockChatSocket } from './mock-chat-socket.js';
import { MOCK_ROUTES, checkAccess } from './mocks.js';

const USE_MOCKS = import.meta.env.DEV && import.meta.env.VITE_USE_MOCKS === 'true';
if (USE_MOCKS) installMockChatSocket();

export function fetchApi(url: string, options: RequestInit): Promise<Response> {
    return USE_MOCKS ? mockFetch(url, options) : fetch(url, options);
}

/**
 * Разбирает тело запроса для мок-обработчиков: FormData в объект, строку - как JSON.
 *
 * @param {FormData|string|undefined} body
 * @returns {Object|null}
 */
function parseBody(body: RequestInit['body']): unknown {
    if (body instanceof FormData) {
        return Object.fromEntries(body);
    }

    // TODO: Сделать валидацию JSON-а.
    return typeof body === 'string' ? JSON.parse(body) : null;
}

/**
 * Подмена fetch для работы без бэкенда: отвечает по таблице MOCK_ROUTES.
 *
 * @param {string} url
 * @param {RequestInit} [options]
 * @returns {Promise<Response>}
 */
async function mockFetch(url: string, options: RequestInit = {}): Promise<Response> {
    const method = (options.method ?? 'GET').toUpperCase();
    const parsedUrl = new URL(url, location.origin);

    const denied = checkAccess(parsedUrl.pathname);
    if (denied) {
        return jsonResponse(denied.body, denied.status);
    }

    const path = parsedUrl.pathname;
    const chatPath = path.replace(
        /^(\/api\/v1\/chats\/)[^/]+(\/(?:messages|seen))?$/,
        '$1{chat_id}$2',
    );
    const route =
        MOCK_ROUTES[`${method} ${path}`] ??
        MOCK_ROUTES[`${method} ${chatPath}`] ??
        MOCK_ROUTES[`${method} ${path.replace(/\/\d+(?=\/|$)/g, '/{id}')}`];
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
function jsonResponse(body: unknown, status: number): Response {
    if (status === 204) {
        return new Response(null, { status });
    }

    return new Response(JSON.stringify(body), {
        status,
        headers: { 'Content-Type': 'application/json' },
    });
}
