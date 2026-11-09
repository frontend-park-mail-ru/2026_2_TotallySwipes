import { logout } from './api/api.js';
import { showModal } from './blocks/modal/modal.js';
import { isNetworkError, showOfflineToast } from './network.js';

async function handleLogout() {
    try {
        await logout();
        location.replace('/login');
    } catch (error) {
        console.error('Не удалось завершить сессию:', error);
        if (isNetworkError(error)) {
            showOfflineToast();
            return;
        }

        showModal({
            title: 'Не удалось выйти из аккаунта',
            text: 'Похоже, что наблюдаются проблемы с подключением. Попробовать ещё раз?',
            buttonText: 'Выйти',
            cancelText: 'Отмена',
            onClose: (result) => {
                if (result === 'confirm') {
                    handleLogout();
                }
            },
        });
    }
}

export function initLogoutButton(button: HTMLElement) {
    button.addEventListener('click', () => {
        showModal({
            title: 'Выйти из аккаунта?',
            text: 'Чтобы снова смотреть анкеты, нужно будет войти ещё раз.',
            buttonText: 'Выйти',
            cancelText: 'Отмена',
            onClose: (result) => {
                if (result === 'confirm') {
                    handleLogout();
                }
            },
        });
    });
}
