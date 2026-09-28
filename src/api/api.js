import { mockFetch } from './mock-fetch.js';

const USE_MOCKS = true;
const API_URL = '/api/v1';

const SWIPE_ACTIONS = {
    like: 'like',
    dislike: 'dislike',
    super: 'like',
};

export class ApiError extends Error {
    constructor(status, code, message) {
        super(message);
        this.name = 'ApiError';
        this.status = status;
        this.code = code;
    }
}

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

async function request(path, { method = 'GET', query, body } = {}) {
    const url = buildUrl(path, query);
    const init = { method, credentials: 'include' };

    if (body !== undefined) {
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
        );
    }

    return data;
}

export function getCurrentUser() {
    return request('/user/me');
}

export function getFeed({ limit = 10, cursor } = {}) {
    return request('/feed', { query: { limit, cursor } });
}

export function sendSwipe(targetUserId, direction) {
    return request('/feed/swipe', {
        method: 'POST',
        body: { target_user_id: targetUserId, action: SWIPE_ACTIONS[direction] },
    });
}
