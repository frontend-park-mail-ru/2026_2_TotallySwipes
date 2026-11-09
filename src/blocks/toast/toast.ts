import toastHbs from './toast.hbs';
import { getElement } from '../../utils/dom.js';

const DEFAULT_DURATION_MS = 5000;

let container: HTMLElement | null = null;

/**
 * @returns Контейнер тостов, создаётся при первом вызове.
 */
function getContainer(): HTMLElement {
    if (!container?.isConnected) {
        container = document.createElement('div');
        container.className = 'toasts';
        document.body.append(container);
    }

    return container;
}

/**
 * @param message - Текст уведомления.
 * @returns Такой тост уже на экране и ещё не скрывается.
 */
function isShown(message: string): boolean {
    return [...getContainer().children].some(
        (toast) =>
            !toast.classList.contains('toast_hiding') &&
            toast.querySelector('.toast__text')?.textContent === message,
    );
}

/**
 * Показывает уведомление, которое само скрывается. Такой же тост, который уже
 * на экране, второй раз не показывается.
 *
 * @param message - Текст уведомления.
 * @param duration - Время показа в мс.
 */
export function showToast(message: string, duration = DEFAULT_DURATION_MS): void {
    if (isShown(message)) return;

    const template = document.createElement('template');
    template.innerHTML = toastHbs({ message }).trim();

    const toast = template.content.firstElementChild;
    if (!(toast instanceof HTMLElement)) return;

    toast.style.setProperty('--toast-duration', `${duration}ms`);

    const hide = () => {
        clearTimeout(timerId);
        toast.classList.add('toast_hiding');
    };
    const timerId = setTimeout(hide, duration);

    getElement(toast, '.toast__close').addEventListener('click', hide);
    toast.addEventListener('animationend', (event) => {
        if (event.animationName === 'toast-out') {
            toast.remove();
        }
    });

    getContainer().append(toast);
}
