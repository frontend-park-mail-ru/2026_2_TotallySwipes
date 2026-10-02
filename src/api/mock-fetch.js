import { MOCK_ROUTES } from './mocks.js';

export async function mockFetch(url, options = {}) {
    const method = (options.method ?? 'GET').toUpperCase();
    const parsedUrl = new URL(url, location.origin);

    const route = MOCK_ROUTES[`${method} ${parsedUrl.pathname}`];
    if (!route) {
        return jsonResponse({ error: { code: 'NOT_FOUND', message: 'Not found' } }, 404);
    }

    const mock = typeof route === 'function' ? route(parsedUrl, options) : route;

    return jsonResponse(mock.body, mock.status);
}

function jsonResponse(body, status) {
    if (status === 204) {
        return new Response(null, { status });
    }

    return new Response(JSON.stringify(body), {
        status,
        headers: { 'Content-Type': 'application/json' },
    });
}
