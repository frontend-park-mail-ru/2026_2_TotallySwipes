import { Router } from './router.js';
import { getElement } from './utils/dom.js';
import { logout, onUnauthorized } from './api/api.js';
import type { AuthResponse } from './api/api.types.js';
import { restoreSession, isAuthenticated, isProfileComplete, setAuthenticated } from './session.js';
import { withLayout } from './blocks/layout/layout.js';
import { setActiveMenuLink } from './blocks/menu/menu.js';
import { renderFeedPage } from './blocks/feed/feed.js';
import { renderTestPage } from './blocks/test/test.js';
import { renderTestResultPage } from './blocks/test-result/test-result.js';
import { renderLoginPage, renderRegisterPage } from './blocks/auth/auth.js';
import { showModal } from './blocks/modal/modal.js';

const GUEST_PATHS = ['/login', '/register'];
const ONBOARDING_PATH = '/register';
const SERVER_ERROR_MODAL = {
    image: '/icons/mascot-error.svg',
    title: 'Произошла ошибка',
    text: 'Ошибка на сервере. Обновите страницу или повторите попытку позднее.',
    buttonText: 'Повторить',
};

/**
 * Создаёт роутер, регистрирует страницы и правила доступа к ним, запускает
 * приложение. Вызывается, когда состояние сессии уже известно.
 */
function startApp() {
    const router = new Router(getElement(document, '#root'));

    onUnauthorized(() => {
        if (!isAuthenticated()) {
            return;
        }

        setAuthenticated(false);
        router.go('/login', { replace: true });
    });

    /**
     * При входе обновляет сессию и отправляет на главную страницу.
     *
     * @param response - Ответ бэкенда на вход.
     */
    function handleLogin(response: AuthResponse) {
        setAuthenticated(true, response.missing);
        router.go('/');
    }

    /**
     * При регистрации проверяет сессию и отправляет на тест или на вход.
     * При ошибке предлагает повторить. Отказ от повтора тоже уводит со страницы
     * регистрации. Если анкета всё ещё не заполнена, правила доступа возвращают
     * на регистрацию.
     */
    async function handleRegister() {
        /**
         * Уходит со страницы регистрации: на тест, если пользователь вошёл,
         * иначе - на вход.
         */
        function leaveRegistration() {
            router.go(isAuthenticated() ? '/test' : '/login', { replace: true });
        }

        try {
            await restoreSession();
        } catch (error) {
            console.error('Не удалось проверить сессию после регистрации:', error);
            showModal({
                ...SERVER_ERROR_MODAL,
                onClose: (returnValue) => {
                    if (returnValue === 'confirm') {
                        handleRegister();
                    } else {
                        leaveRegistration();
                    }
                },
            });
            return;
        }

        leaveRegistration();
    }

    /**
     * При выходе завершает сессию и отправляет на вход. При ошибке предлагает
     * повторить. Отказ от повтора возвращает на главную без выхода.
     */
    async function handleLogout() {
        try {
            await logout();
        } catch (error) {
            console.error('Не удалось завершить сессию на сервере:', error);
            showModal({
                ...SERVER_ERROR_MODAL,
                onClose: (returnValue) => {
                    if (returnValue === 'confirm') {
                        handleLogout();
                    } else {
                        router.go('/', { replace: true });
                    }
                },
            });
            return;
        }

        setAuthenticated(false);
        router.go('/login', { replace: true });
    }

    router
        .register('/login', (root) => renderLoginPage(root, { onLogin: handleLogin }))
        .register('/register', (root) =>
            renderRegisterPage(root, {
                resume: isAuthenticated(),
                onRegister: handleRegister,
            }),
        )
        .register('/logout', handleLogout)
        .register('/', withLayout(renderFeedPage))
        .register('/test', withLayout(renderTestPage))
        .register('/test/result', withLayout(renderTestResultPage))
        .register(
            '*',
            withLayout((container) => {
                container.textContent = 'Страница не найдена';
            }),
        )
        .beforeEach((path) => {
            const isGuestPath = GUEST_PATHS.includes(path);

            if (!isAuthenticated()) {
                return isGuestPath ? null : '/login';
            }

            if (path === '/logout') {
                return null;
            }

            if (!isProfileComplete()) {
                return path === ONBOARDING_PATH ? null : ONBOARDING_PATH;
            }

            return isGuestPath ? '/' : null;
        })
        .onChange(setActiveMenuLink);

    router.start();
}

/**
 * Проверяет сессию и запускает приложение. При ошибке предлагает повторить
 * проверку.
 */
async function checkSession() {
    try {
        await restoreSession();
    } catch (error) {
        console.error('Не удалось восстановить сессию:', error);
        showModal({
            ...SERVER_ERROR_MODAL,
            onClose: checkSession,
        });
        return;
    }

    startApp();
}

checkSession();
