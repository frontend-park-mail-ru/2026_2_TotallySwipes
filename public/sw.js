const CACHE_NAME = 'v1';
const STATIC_PATHS = ['/assets/', '/icons/', '/fonts/', '/stickers/', '/badges/', '/img/'];

self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            return cache.addAll(['/', '/fonts/Onest-VariableFont_wght.ttf']);
        }),
    );
});

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
