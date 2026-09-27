import { MOCK_ROUTES } from './mocks.js';

const MOCK_DELAY_MS = 300;

export async function mockFetch(url, options = {}) {
    const method = (options.method ?? 'GET').toUpperCase();
    const { pathname } = new URL(url, location.origin);

    await new Promise((resolve) => setTimeout(resolve, MOCK_DELAY_MS));

    const handler = MOCK_ROUTES[`${method} ${pathname}`];
    if (!handler) {
        return jsonResponse(404, { error: { code: 'NOT_FOUND', message: 'Not found' } });
    }

    // TODO: Сделать валидацию JSON-а.
    const body = options.body ? JSON.parse(options.body) : null;
    const { status, body: responseBody } = handler({ body });

    return jsonResponse(status, responseBody);
}

function jsonResponse(status, body) {
    if (status === 204) {
        return new Response(null, { status });
    }

    return new Response(JSON.stringify(body), {
        status,
        headers: { 'Content-Type': 'application/json' },
    });
}
