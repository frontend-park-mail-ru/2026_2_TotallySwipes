import { MOCK_ROUTES } from './mocks.js';

export async function mockFetch(url, options = {}) {
    const method = (options.method ?? 'GET').toUpperCase();
    const { pathname } = new URL(url, location.origin);

    const mock = MOCK_ROUTES[`${method} ${pathname}`];
    if (!mock) {
        return jsonResponse({ error: { code: 'NOT_FOUND', message: 'Not found' } }, 404);
    }

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
