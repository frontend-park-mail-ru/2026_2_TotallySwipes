import { Router } from './router.js';
import { logout } from './api/api.js';
import { restoreSession, isAuthenticated, setAuthenticated } from './session.js';
import { withLayout } from './blocks/layout/layout.js';
import { setActiveMenuLink } from './blocks/menu/menu.js';
import { renderFeedPage } from './blocks/feed/feed.js';
import { renderAuthPage } from './blocks/auth/auth.js';

const GUEST_PATHS = ['/login'];

await restoreSession();

const router = new Router(document.getElementById('root'));

function handleLogin() {
    setAuthenticated(true);
    router.go('/');
}

async function handleLogout() {
    try {
        await logout();
    } catch (error) {
        console.error('Не удалось завершить сессию на сервере:', error);
    }

    setAuthenticated(false);
    router.go('/login', { replace: true });
}

router
    .register('/login', (root) => renderAuthPage(root, { onLogin: handleLogin }))
    .register('/logout', handleLogout)
    .register('/', withLayout(renderFeedPage))
    .register('*', withLayout((container) => {
        container.textContent = 'Страница не найдена';
    }))
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
