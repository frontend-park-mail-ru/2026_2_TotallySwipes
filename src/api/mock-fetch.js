import { MOCK_ROUTES } from './mocks.js';

const MULTI_VALUE_FIELDS = ['tags', 'photos'];

function parseBody(body) {
    if (body instanceof FormData) {
        const fields = Object.fromEntries(body);

        MULTI_VALUE_FIELDS.forEach((field) => {
            fields[field] = body.getAll(field);
        });

        return fields;
    }

    // TODO: Сделать валидацию JSON-а.
    return body ? JSON.parse(body) : null;
}

export async function mockFetch(url, options = {}) {
    const method = (options.method ?? 'GET').toUpperCase();
    const parsedUrl = new URL(url, location.origin);

    const route = MOCK_ROUTES[`${method} ${parsedUrl.pathname}`];
    if (!route) {
        return jsonResponse({ error: { code: 'NOT_FOUND', message: 'Not found' } }, 404);
    }

    const mock =
        typeof route === 'function'
            ? route(parsedUrl, { ...options, body: parseBody(options.body) })
            : route;

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
