import { NetworkError } from './api/api.js';
import { showToast } from './blocks/toast/toast.js';

const OFFLINE_TOAST_TEXT = 'Нет соединения с интернетом. Проверьте подключение.';

/**
 * navigator.onLine надёжен только в одну сторону: false точно значит «сети нет».
 *
 * @param error - Ошибка запроса.
 * @returns Не удалось связаться с сервером.
 */
export function isNetworkError(error: unknown): boolean {
    return !navigator.onLine || error instanceof NetworkError;
}

/**
 * Показывает тост «Нет соединения». Не блокирует страницу: загруженное остаётся.
 */
export function showOfflineToast(): void {
    showToast(OFFLINE_TOAST_TEXT);
}
