function draftKey(userId) {
    return `test-draft:${userId}`;
}

function resultKey(userId) {
    return `test-result:${userId}`;
}

function read(key) {
    try {
        return JSON.parse(localStorage.getItem(key));
    } catch {
        return null;
    }
}

function write(key, value) {
    try {
        localStorage.setItem(key, JSON.stringify(value));
    } catch {
        return;
    }
}

function remove(key) {
    try {
        localStorage.removeItem(key);
    } catch {
        return;
    }
}

export function saveDraft(userId, draft) {
    write(draftKey(userId), draft);
}

export function startDraft(userId) {
    write(draftKey(userId), { answers: {} });
}

export function loadDraft(userId) {
    return read(draftKey(userId));
}

export function clearDraft(userId) {
    remove(draftKey(userId));
}

export function saveResult(userId, result) {
    write(resultKey(userId), result);
}

export function loadResult(userId) {
    return read(resultKey(userId));
}

export function clearResult(userId) {
    remove(resultKey(userId));
}
