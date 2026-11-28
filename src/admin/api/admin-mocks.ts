import type { MockResponse, MockRoute } from '../../api/mocks.js';
import type {
    Config,
    ConfigDetails,
    ConfigKind,
    Override,
    Scope,
    ScopeInfo,
    UserRef,
} from './admin-api.types.js';

// Моки админского API OnlineConf.

const FORBIDDEN_KEY = 'mock-admin-forbidden';

const ADMIN: UserRef = { user_id: 5, email: 'admin@swipes.ru' };

const SCOPES: ScopeInfo[] = [
    { scope: 'frontend', title: 'Продуктовый фронт' },
    { scope: 'gateway', title: 'Gateway' },
    { scope: 'auth', title: 'Auth' },
    { scope: 'profile', title: 'Profile' },
    { scope: 'matching', title: 'Matching' },
    { scope: 'chat', title: 'Chat' },
];

const CONFIGS: Config[] = [
    {
        id: 12,
        scope: 'matching',
        name: 'timepad_enabled',
        key: 'matching.timepad_enabled',
        kind: 'flag',
        value_type: 'bool',
        value: true,
        rollout_percent: 10,
        constraints: null,
        rollout_policy_id: null,
        rollout: null,
        client_visible: true,
        description:
            'Подбор мест для свидания через Timepad. Кнопка на фронте и создание подбора на бэке.',
        version: 3,
        overrides_count: 2,
        created_at: '2026-11-28T10:40:00Z',
        updated_at: '2026-11-28T12:30:00Z',
        updated_by: ADMIN,
    },
    {
        id: 14,
        scope: 'profile',
        name: 'photo_upload_policy',
        key: 'profile.photo_upload_policy',
        kind: 'config',
        value_type: 'json',
        value: {
            max_file_size_mb: 5,
            allowed_mime_types: ['image/jpeg', 'image/png', 'image/webp'],
        },
        rollout_percent: null,
        constraints: null,
        rollout_policy_id: null,
        rollout: null,
        client_visible: true,
        description: 'Допустимые форматы и размер фото',
        version: 1,
        overrides_count: 0,
        created_at: '2026-11-28T10:40:00Z',
        updated_at: '2026-11-28T10:40:00Z',
        updated_by: ADMIN,
    },
];

// Исключения лежат отдельно от записей, как в отдельной таблице на бэкенде:
// список отдаёт CONFIGS как есть, а карточка добавляет к записи её исключения.
const OVERRIDES: Record<number, Override[]> = {
    12: [
        {
            user_id: 104,
            email: 'tester@swipes.ru',
            enabled: true,
            created_at: '2026-11-28T12:35:00Z',
            created_by: ADMIN,
        },
        {
            user_id: 230,
            email: 'no-timepad@swipes.ru',
            enabled: false,
            created_at: '2026-11-28T12:36:00Z',
            created_by: ADMIN,
        },
    ],
};

const error = (status: number, code: string, message: string): MockResponse => ({
    status,
    body: { error: { code, message } },
});

const isForbidden = () => localStorage.getItem(FORBIDDEN_KEY) === '1';
const forbidden = () => error(403, 'FORBIDDEN', 'Нет доступа к админке');

/**
 * Добавляет к обработчику проверку прав. Ответ 401 без сессии отдаёт checkAccess из mocks.ts.
 * Чтобы проверить экран «Нет доступа», выполните в консоли
 * localStorage.setItem('mock-admin-forbidden', '1').
 *
 * @param {Function} handler - Обработчик, который вызывается при наличии прав.
 * @returns {MockRoute}
 */
function adminOnly(handler: (url: URL) => MockResponse): MockRoute {
    return function (url: URL) {
        return isForbidden() ? forbidden() : handler(url);
    };
}

/**
 * GET /admin/configs: фильтрует по scope и kind, ищет подстроку q в ключе без учёта регистра,
 * сортирует по ключу. Так же работает бэкенд.
 *
 * @param {URL} url
 * @returns {MockResponse}
 */
function listConfigs(url: URL): MockResponse {
    const scope = url.searchParams.get('scope') as Scope | null;
    const kind = url.searchParams.get('kind') as ConfigKind | null;
    const q = url.searchParams.get('q')?.toLowerCase();

    const items = CONFIGS.filter(
        (config) =>
            (!scope || config.scope === scope) &&
            (!kind || config.kind === kind) &&
            (!q || config.key.toLowerCase().includes(q)),
    ).sort((a, b) => a.key.localeCompare(b.key));

    return { status: 200, body: { items } };
}

/**
 * GET /admin/configs/{id}: карточка с исключениями или 404 NOT_FOUND.
 *
 * @param {URL} url
 * @returns {MockResponse}
 */
function getConfig(url: URL): MockResponse {
    const id = Number(url.pathname.split('/').pop());
    const config = CONFIGS.find((item) => item.id === id);

    if (!config) {
        return error(404, 'NOT_FOUND', 'Настройка не найдена');
    }

    const details: ConfigDetails = { ...config, overrides: OVERRIDES[id] ?? [] };
    return { status: 200, body: details };
}

// mockFetch заменяет числа в пути на {id}, поэтому запрос /admin/configs/12 попадает
// в маршрут /admin/configs/{id}.
export const ADMIN_MOCK_ROUTES: Record<string, MockRoute> = {
    'GET /api/v1/admin/me': adminOnly(() => ({ status: 200, body: ADMIN })),
    'GET /api/v1/admin/scopes': adminOnly(() => ({ status: 200, body: { items: SCOPES } })),
    'GET /api/v1/admin/configs': adminOnly(listConfigs),
    'GET /api/v1/admin/configs/{id}': adminOnly(getConfig),
};
