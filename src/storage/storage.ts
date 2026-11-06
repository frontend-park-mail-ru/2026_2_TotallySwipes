/**
 * Читает JSON из localStorage.
 *
 * @param {string} key
 * @returns {*} Значение или null, если его нет или хранилище недоступно.
 */
export function read<T>(key: string): T | null {
    try {
        const value = localStorage.getItem(key);
        return value === null ? null : JSON.parse(value);
    } catch {
        return null;
    }
}

/**
 * Пишет значение в localStorage как JSON, ошибки хранилища игнорирует.
 *
 * @param {string} key
 * @param {*} value
 */
export function write(key: string, value: unknown): void {
    try {
        localStorage.setItem(key, JSON.stringify(value));
    } catch {
        return;
    }
}

export function remove(key: string): void {
    try {
        localStorage.removeItem(key);
    } catch {
        return;
    }
}
