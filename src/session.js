import { refreshSession } from './api/api.js';

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
    } catch {
        authenticated = false;
    }

    return authenticated;
}
