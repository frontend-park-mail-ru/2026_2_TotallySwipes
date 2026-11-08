const CACHE_NAME = 'v1';
const STATIC_PATHS = ['/assets/', '/icons/', '/fonts/', '/stickers/', '/badges/', '/img/'];

const FONT_URL = '/fonts/Onest-VariableFont_wght.ttf';

const OFFLINE_IMAGE_URLS = ['/icons/mascot-error.svg', '/icons/x.svg'];

self.addEventListener('install', (event) => {
    event.waitUntil(precache());
});

async function precache() {
    const cache = await caches.open(CACHE_NAME);

    const resp = await fetch('/');
    if (!resp.ok) {
        throw new Error(`Не удалось загрузить index.html: ${resp.status}`);
    }

    const html = await resp.clone().text();
    // сет нужен, чтобы не файлы не добавились повторно, а то addall упадет
    const assets = [...new Set(html.match(/\/assets\/[^"']+/g) ?? [])];

    await cache.addAll([...assets, FONT_URL, ...OFFLINE_IMAGE_URLS]);
    // html кладём последним,если ассеты не скачались установка упадет целиком
    await cache.put('/', resp);
}

self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches
            .keys()
            .then((names) =>
                Promise.all(
                    names.filter((name) => name !== CACHE_NAME).map((name) => caches.delete(name)),
                ),
            ),
    );
});

self.addEventListener('fetch', (event) => {
    if (event.request.mode === 'navigate') {
        event.respondWith(networkFirst(event.request));
    } else if (event.request.method === 'GET') {
        const url = new URL(event.request.url);
        // проверяем что мы идем именно к сайту
        if (
            url.origin === self.location.origin &&
            STATIC_PATHS.some((el) => url.pathname.startsWith(el))
        ) {
            event.respondWith(cacheFirst(event.request));
        }
    }
});

async function cacheFirst(request) {
    const cache = await caches.open(CACHE_NAME);
    const cached = await cache.match(request);

    if (cached) {
        return cached;
    }

    const resp = await fetch(request);
    if (resp.ok) {
        // клон нужен тк без него бразер бы отдавал боди алреди юзд
        await cache.put(request, resp.clone());
    }
    return resp;
}

async function networkFirst(request) {
    const cache = await caches.open(CACHE_NAME);
    try {
        const resp = await fetch(request);
        if (resp.ok) {
            // клон нужен тк без него бразер бы отдавал боди алреди юзд
            await cache.put('/', resp.clone());
        }
        return resp;
    } catch {
        const cached = await cache.match('/');
        return cached;
    }
}
