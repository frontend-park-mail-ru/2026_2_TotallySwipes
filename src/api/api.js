import { mockFetch } from './mock-fetch.js';

const USE_MOCKS = false;
const API_URL = '/api/v1';
// const API_URL = 'http://161.104.105.207:8080/api/v1';

// раскомментировать при добавлении свайпа на бек
// const SWIPE_ACTIONS = {
//     like: 'like',
//     dislike: 'dislike',
//     super: 'like',
// };

export class ApiError extends Error {
    constructor(status, code, message, fields = null) {
        super(message);
        this.name = 'ApiError';
        this.status = status;
        this.code = code;
        this.fields = fields;
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

export function login(email, password) {
    return request('/auth/login', {
        method: 'POST',
        body: { email: toAsciiEmail(email), password: password.normalize('NFC') },
    });
}

export function register(profile) {
    const form = new FormData();

    form.append('name', profile.name);
    form.append('email', toAsciiEmail(profile.email));
    form.append('password', profile.password.normalize('NFC'));
    form.append('birth_date', profile.birthDate);
    form.append('sex', profile.sex);
    form.append('search_sex', profile.searchSex);
    form.append('dating_intent', profile.datingIntent);
    form.append('search_age_from', profile.searchAgeFrom);
    form.append('search_age_to', profile.searchAgeTo);
    profile.interests.forEach((interest) => form.append('tags', interest));
    profile.photos.forEach((photo) => form.append('photos', photo));

    return request('/auth/register', { method: 'POST', body: form });
}

export function logout() {
    return request('/auth/logout', { method: 'POST' });
}

export function refreshSession() {
    return request('/auth/refresh', { method: 'POST' });
}

export function getCurrentUser() {
    return request('/profile/me/short');
}

export function getFeed({ limit = 10, cursor } = {}) {
    return request('/feed', { query: { limit, cursor } });
}

export function getCurrentTest() {
    return request('/tests/current');
}

export function sendTestResults(testId, answers) {
    return request(`/tests/${testId}/results`, {
        method: 'POST',
        body: { answers },
    });
}

export function sendSwipe() {
    return Promise.resolve();
}

// export function sendSwipe(targetUserId, direction) {
//     return request('/feed/swipe', {
//         method: 'POST',
//         body: { target_user_id: targetUserId, action: SWIPE_ACTIONS[direction] },
//     });
// }
