import { Router } from './router.js';
import { getElement } from './dom.js';
import { logout, onUnauthorized } from './api/api.js';
import type { AuthResponse } from './api/api.types.js';
import { restoreSession, isAuthenticated, isProfileComplete, setAuthenticated } from './session.js';
import { withLayout } from './blocks/layout/layout.js';
import { setActiveMenuLink } from './blocks/menu/menu.js';
import { renderFeedPage } from './blocks/feed/feed.js';
import { renderTestPage } from './blocks/test/test.js';
import { renderTestResultPage } from './blocks/test-result/test-result.js';
import { renderAuthPage, renderRegisterPage } from './blocks/auth/auth.js';
import { showToast } from './blocks/toast/toast.js';
import { renderMatchesPage } from './blocks/matches/matches.js';

const GUEST_PATHS = ['/login', '/register'];
const ONBOARDING_PATH = '/register';
const SERVER_ERROR_MESSAGE = 'Ошибка на сервере. Обновите страницу или повторите попытку позднее.';

let sessionChecked = true;

/**
 * Создаёт роутер, регистрирует страницы и запускает приложение.
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
     * @param {{missing: string[]}} response - Ответ бэкенда на вход.
     */
    function handleLogin({ missing }: AuthResponse) {
        setAuthenticated(true, missing);
        router.go('/');
    }

    /**
     * После регистрации проверяет сессию и ведёт на тест или на вход.
     * Если анкета всё ещё не заполнена, guard вернёт на регистрацию.
     */
    async function handleRegistered() {
        try {
            await restoreSession();
        } catch (error) {
            console.error('Не удалось проверить сессию после регистрации:', error);
            showToast(SERVER_ERROR_MESSAGE);
        }

        router.go(isAuthenticated() ? '/test' : '/login', { replace: true });
    }

    async function handleLogout() {
        try {
            await logout();
        } catch (error) {
            console.error('Не удалось завершить сессию на сервере:', error);
            showToast(SERVER_ERROR_MESSAGE);
            router.go('/', { replace: true });
            return;
        }

        setAuthenticated(false);
        router.go('/login', { replace: true });
    }

    router
        .register('/login', (root) => renderAuthPage(root, { onLogin: handleLogin }))
        .register('/register', (root) =>
            renderRegisterPage(root, {
                resume: isAuthenticated(),
                onRegistered: handleRegistered,
            }),
        )
        .register('/logout', handleLogout)
        .register('/', withLayout(renderFeedPage))
        .register('/test', withLayout(renderTestPage))
        .register('/test/result', withLayout(renderTestResultPage))
        .register('/matches', withLayout(renderMatchesPage))
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

try {
    await restoreSession();
} catch (error) {
    console.error('Не удалось восстановить сессию:', error);
    showToast(SERVER_ERROR_MESSAGE);
    sessionChecked = false;
}

if (sessionChecked) {
    startApp();
}
