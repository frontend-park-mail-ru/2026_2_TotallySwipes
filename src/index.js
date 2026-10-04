import { Router } from './router.js';
import { logout, onUnauthorized } from './api/api.js';
import { restoreSession, isAuthenticated, setAuthenticated } from './session.js';
import { withLayout } from './blocks/layout/layout.js';
import { setActiveMenuLink } from './blocks/menu/menu.js';
import { renderFeedPage } from './blocks/feed/feed.js';
import { renderTestPage } from './blocks/test/test.js';
import { renderTestResultPage } from './blocks/test-result/test-result.js';
import { renderAuthPage, renderRegisterPage } from './blocks/auth/auth.js';
import { showToast } from './blocks/toast/toast.js';

const GUEST_PATHS = ['/login', '/register'];
const SERVER_ERROR_MESSAGE = 'Ошибка на сервере. Обновите страницу или повторите попытку позднее.';

let sessionChecked = true;

function startApp() {
    const router = new Router(document.getElementById('root'));

    onUnauthorized(() => {
        if (!isAuthenticated()) {
            return;
        }

        setAuthenticated(false);
        router.go('/login', { replace: true });
    });

    function handleLogin() {
        setAuthenticated(true);
        router.go('/');
    }

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
            renderRegisterPage(root, { onRegistered: handleRegistered }),
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

            if (!isAuthenticated() && !isGuestPath) {
                return '/login';
            }

            if (isAuthenticated() && isGuestPath) {
                return '/';
            }

            return null;
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
