import { Router } from './router.js';
import { renderLayout } from './blocks/layout/layout.js';
import { setActiveMenuLink } from './blocks/menu/menu.js';
import { renderFeedPage } from './blocks/feed/feed.js';
import { renderTestResultPage } from './blocks/test-result/test-result.js';

const main = renderLayout(document.getElementById('root'));

const router = new Router(main);

router
    .register('/', renderFeedPage)
    .register('/test/result', renderTestResultPage)
    .register('*', (container) => {
        container.textContent = 'Страница не найдена';
    })
    .onChange(setActiveMenuLink);

router.start();
