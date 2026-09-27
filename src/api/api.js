import { mockFetch } from './mock-fetch.js';

const USE_MOCKS = true;
const API_URL = '/api/v1';

export class APIError extends Error {
    constructor(status, code, message) {
        super(message);
        this.status = status;
        this.code = code;
    }
}

async function request(path, options = {}) {
    const url = `${API_URL}${path}`;
    const init = { credentials: 'include', ...options };

    const response = USE_MOCKS ? await mockFetch(url, init) : await fetch(url, init);

    if (!response.ok) {
        const body = await response.json().catch(() => null);
        throw new APIError(
            response.status,
            body?.error?.code ?? null,
            body?.error?.message ?? `${init.method ?? 'GET'} ${url} — ${response.status}`,
        );
    }

    if (response.status === 204) {
        return null;
    }

    return response.json();
}

function post(path, data) {
    return request(path, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: data === undefined ? undefined : JSON.stringify(data),
    });
}

export function login(email, password) {
    return post('/auth/login', { email: email.trim(), password });
}

export function logout() {
    return post('/auth/logout');
}

export function refreshSession() {
    return post('/auth/refresh');
}

// TODO: В контракте бэкенда нет /user/me, уточнить, откуда брать данные профиля.
export function getCurrentUser() {
    return request('/user/me');
}
