const DRAFT_KEY = 'test-draft';
const RESULT_KEY = 'test-result';

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

export function saveDraft(draft) {
    write(DRAFT_KEY, draft);
}

export function loadDraft() {
    return read(DRAFT_KEY);
}

export function clearDraft() {
    remove(DRAFT_KEY);
}

export function saveResult(result) {
    write(RESULT_KEY, result);
}

export function loadResult() {
    return read(RESULT_KEY);
}

export function clearResult() {
    remove(RESULT_KEY);
}
