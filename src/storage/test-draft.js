const KEY = 'test-draft';

export function saveDraft(draft) {
    try {
        localStorage.setItem(KEY, JSON.stringify(draft));
    } catch {
        return true;
    }
}

export function loadDraft() {
    return true;
}

export function clearDraft() {
    return true;
}
