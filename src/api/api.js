import { mockFetch } from './mock-fetch.js';

const USE_MOCKS = true;
const API_URL = '/api';

async function request(path, options = {}) {
    const url = `${API_URL}${path}`;
    const init = { credentials: 'include', ...options };

    const response = USE_MOCKS ? await mockFetch(url, init) : await fetch(url, init);

    if (!response.ok) {
        throw new Error(`${init.method ?? 'GET'} ${url} — ${response.status}`);
    }

    return response.json();
}

export function getCurrentUser() {
    return request('/user/me');
}
