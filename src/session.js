import { refreshSession, ApiError } from './api/api.js';

let authenticated = false;

export function isAuthenticated() {
    return authenticated;
}

export function setAuthenticated(value) {
    authenticated = value;
}

export async function restoreSession() {
    try {
        await refreshSession();
        authenticated = true;
    } catch (error) {
        if (!(error instanceof ApiError && error.status === 401)) {
            throw error;
        }

        authenticated = false;
    }

    return authenticated;
}
