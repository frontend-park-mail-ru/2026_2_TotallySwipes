import type { MockHandler, MockResponse, MockRoute } from '../../api/mocks.js';
import type {
    Config,
    ConfigCreate,
    ConfigDetails,
    ConfigKind,
    ConfigUpdate,
    ConfigValue,
    NumberConstraints,
    Override,
    Scope,
    ScopeInfo,
    UserRef,
    ValueType,
} from './admin-api.types.js';

// Моки админского API OnlineConf. Записи хранятся в localStorage, поэтому правки переживают F5.
// Вернуть исходные данные: localStorage.removeItem('mock-admin-store').

const FORBIDDEN_KEY = 'mock-admin-forbidden';
const STORE_KEY = 'mock-admin-store';

const ADMIN: UserRef = { user_id: 5, email: 'admin@swipes.ru' };

const SCOPES: ScopeInfo[] = [
    { scope: 'frontend', title: 'Продуктовый фронт' },
    { scope: 'gateway', title: 'Gateway' },
    { scope: 'auth', title: 'Auth' },
    { scope: 'profile', title: 'Profile' },
    { scope: 'matching', title: 'Matching' },
    { scope: 'chat', title: 'Chat' },
];

const KINDS: ConfigKind[] = ['flag', 'config'];
const VALUE_TYPES: ValueType[] = ['bool', 'number', 'string', 'array', 'json'];

const NAME_PATTERN = /^[a-z0-9_]{1,64}$/;
const MAX_STRING_LENGTH = 4096;
const MAX_DESCRIPTION_LENGTH = 1000;
const PHOTO_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

/** Всё, что моки хранят в localStorage. */
interface MockStore {
    /** Настройки без исключений, как строки списка. */
    configs: Config[];
    /** Исключения по id настройки, как отдельная таблица на бэкенде. */
    overrides: Record<number, Override[]>;
}

const INITIAL_STORE: MockStore = {
    configs: [
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
    ],
    overrides: {
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
    },
};

/**
 * Читает данные моков из localStorage. Если там пусто, берёт копию INITIAL_STORE.
 *
 * @returns {MockStore}
 */
function loadStore(): MockStore {
    const saved = localStorage.getItem(STORE_KEY);
    return saved ? JSON.parse(saved) : structuredClone(INITIAL_STORE);
}

const store = loadStore();

const saveStore = () => localStorage.setItem(STORE_KEY, JSON.stringify(store));

const now = () => new Date().toISOString().replace(/\.\d{3}Z$/, 'Z');

/**
 * Ответ с ошибкой в формате API.
 *
 * @param {number} status
 * @param {string} code
 * @param {string} message
 * @param {Object<string, string>} [fields] - Ошибки отдельных полей.
 * @returns {MockResponse}
 */
function error(
    status: number,
    code: string,
    message: string,
    fields?: Record<string, string>,
): MockResponse {
    return { status, body: { error: { code, message, fields } } };
}

const notFound = () => error(404, 'NOT_FOUND', 'Настройка не найдена');
const versionConflict = () =>
    error(409, 'VERSION_CONFLICT', 'Настройку уже изменили, обновите страницу');
const validationError = (fields: Record<string, string>) =>
    error(400, 'VALIDATION_ERROR', 'Некорректные данные', fields);

const isForbidden = () => localStorage.getItem(FORBIDDEN_KEY) === '1';
const forbidden = () => error(403, 'FORBIDDEN', 'Нет доступа к админке');

/**
 * Добавляет к обработчику проверку прав. Ответ 401 без сессии отдаёт checkAccess из mocks.ts.
 * Чтобы проверить экран «Нет доступа», выполните в консоли
 * localStorage.setItem('mock-admin-forbidden', '1').
 *
 * @param {MockHandler} handler - Обработчик, который вызывается при наличии прав.
 * @returns {MockRoute}
 */
function adminOnly(handler: MockHandler): MockRoute {
    return function (url, request) {
        return isForbidden() ? forbidden() : handler(url, request);
    };
}

/**
 * @param {URL} url - Адрес вида /api/v1/admin/configs/12.
 * @returns {Config|undefined} Настройка с id из адреса.
 */
function findConfig(url: URL): Config | undefined {
    const id = Number(url.pathname.split('/').pop());
    return store.configs.find((config) => config.id === id);
}

const isPlainObject = (value: unknown): value is Record<string, unknown> =>
    typeof value === 'object' && value !== null && !Array.isArray(value);

/**
 * Проверяет число по ограничениям.
 *
 * @param {number} value
 * @param {NumberConstraints|null} constraints
 * @returns {string|null} Текст ошибки или null, если число подходит.
 */
function numberError(value: number, constraints: NumberConstraints | null): string | null {
    const { min, max, integer } = constraints ?? {};
    const hasMin = min !== undefined && min !== null;
    const hasMax = max !== undefined && max !== null;

    const fits =
        (!integer || Number.isInteger(value)) &&
        (!hasMin || value >= min) &&
        (!hasMax || value <= max);
    if (fits) {
        return null;
    }

    let range = '';
    if (hasMin && hasMax) {
        range = ` от ${min} до ${max}`;
    } else if (hasMin) {
        range = ` не меньше ${min}`;
    } else if (hasMax) {
        range = ` не больше ${max}`;
    }

    return `Значение должно быть ${integer ? 'целым числом' : 'числом'}${range}`;
}

/**
 * Проверяет, что значение подходит под тип. Для числа учитывает ограничения.
 *
 * @param {ValueType} valueType
 * @param {*} value
 * @param {NumberConstraints|null} constraints
 * @returns {string|null} Текст ошибки или null, если значение подходит.
 */
function valueError(
    valueType: ValueType,
    value: unknown,
    constraints: NumberConstraints | null,
): string | null {
    switch (valueType) {
        case 'bool':
            return typeof value === 'boolean' ? null : 'Значение должно быть true или false';
        case 'number':
            if (typeof value !== 'number' || !Number.isFinite(value)) {
                return 'Значение должно быть числом';
            }
            return numberError(value, constraints);
        case 'string':
            if (typeof value !== 'string') {
                return 'Значение должно быть строкой';
            }
            return value.length <= MAX_STRING_LENGTH
                ? null
                : `Строка должна быть не длиннее ${MAX_STRING_LENGTH} символов`;
        case 'array':
            return Array.isArray(value) ? null : 'Значение должно быть JSON-массивом';
        case 'json':
            return isPlainObject(value) ? null : 'Значение должно быть JSON-объектом';
    }
}

/**
 * Проверяет структуру profile.photo_upload_policy. Этот ключ читает продукт,
 * поэтому сервер проверяет не только то, что это объект, но и его поля.
 *
 * @param {Object} value
 * @returns {string|null} Текст ошибки или null, если структура подходит.
 */
function photoPolicyError(value: Record<string, unknown>): string | null {
    const size = value.max_file_size_mb;
    if (typeof size !== 'number' || !Number.isInteger(size) || size < 1 || size > 10) {
        return 'max_file_size_mb: целое число от 1 до 10';
    }

    const types = value.allowed_mime_types;
    const typesFit =
        Array.isArray(types) &&
        types.length > 0 &&
        types.every((type) => PHOTO_MIME_TYPES.includes(type));
    if (!typesFit) {
        return `allowed_mime_types: поддерживаются только ${PHOTO_MIME_TYPES.join(', ')}`;
    }

    return null;
}

/**
 * Проверяет значение вместе с правилами конкретного ключа.
 *
 * @param {string} key - scope.name.
 * @param {ValueType} valueType
 * @param {*} value
 * @param {NumberConstraints|null} constraints
 * @returns {string|null}
 */
function fullValueError(
    key: string,
    valueType: ValueType,
    value: unknown,
    constraints: NumberConstraints | null,
): string | null {
    const typeError = valueError(valueType, value, constraints);
    if (typeError) {
        return typeError;
    }

    if (key === 'profile.photo_upload_policy') {
        return photoPolicyError(value as Record<string, unknown>);
    }

    return null;
}

/**
 * У флага процент обязателен и лежит в 0--100, у конфига процента нет.
 *
 * @param {ConfigKind} kind
 * @param {*} percent
 * @returns {string|null}
 */
function rolloutError(kind: ConfigKind, percent: unknown): string | null {
    if (kind === 'config') {
        return percent === undefined || percent === null ? null : 'У конфига нет процента раскатки';
    }

    const fits =
        typeof percent === 'number' && Number.isInteger(percent) && percent >= 0 && percent <= 100;
    return fits ? null : 'Процент должен быть целым числом от 0 до 100';
}

/**
 * @param {*} description
 * @returns {string|null}
 */
function descriptionError(description: unknown): string | null {
    if (description === undefined) {
        return null;
    }

    return typeof description === 'string' && description.length <= MAX_DESCRIPTION_LENGTH
        ? null
        : `Описание должно быть не длиннее ${MAX_DESCRIPTION_LENGTH} символов`;
}

/**
 * Проверяет тело POST /admin/configs по правилам из YAML.
 *
 * @param {ConfigCreate} data
 * @returns {Object<string, string>} Ошибки по полям. Пустой объект -- ошибок нет.
 */
function validateCreate(data: ConfigCreate): Record<string, string> {
    const fields: Record<string, string> = {};

    if (!SCOPES.some((item) => item.scope === data.scope)) {
        fields.scope = 'Неизвестный scope';
    }
    if (typeof data.name !== 'string' || !NAME_PATTERN.test(data.name)) {
        fields.name = 'Только латиница в нижнем регистре, цифры и _, до 64 символов';
    }
    if (!KINDS.includes(data.kind)) {
        fields.kind = 'Тип записи -- flag или config';
    }
    if (!VALUE_TYPES.includes(data.value_type)) {
        fields.value_type = 'Неизвестный тип значения';
    } else if (data.kind === 'flag' && data.value_type !== 'bool') {
        fields.value_type = 'У флага тип значения только bool';
    }

    if (!fields.value_type) {
        const key = `${data.scope}.${data.name}`;
        const message = fullValueError(key, data.value_type, data.value, data.constraints ?? null);
        if (message) {
            fields.value = message;
        }
    }

    if (!fields.kind) {
        const message = rolloutError(data.kind, data.rollout_percent);
        if (message) {
            fields.rollout_percent = message;
        }
    }

    const description = descriptionError(data.description);
    if (description) {
        fields.description = description;
    }

    return fields;
}

/**
 * Проверяет тело PUT /admin/configs/{id}. Тип значения и kind берутся из сохранённой записи.
 *
 * @param {Config} config - Сохранённая запись.
 * @param {ConfigUpdate} data
 * @returns {Object<string, string>} Ошибки по полям. Пустой объект -- ошибок нет.
 */
function validateUpdate(config: Config, data: ConfigUpdate): Record<string, string> {
    const fields: Record<string, string> = {};
    const constraints = data.constraints === undefined ? config.constraints : data.constraints;
    const percent =
        data.rollout_percent === undefined ? config.rollout_percent : data.rollout_percent;

    const value = fullValueError(config.key, config.value_type, data.value, constraints);
    if (value) {
        fields.value = value;
    }

    const rollout = rolloutError(config.kind, percent);
    if (rollout) {
        fields.rollout_percent = rollout;
    }

    if (typeof data.client_visible !== 'boolean') {
        fields.client_visible = 'Нужно true или false';
    }

    const description = descriptionError(data.description ?? '');
    if (description) {
        fields.description = description;
    }

    if (typeof data.version !== 'number') {
        fields.version = 'Нужна версия из последнего GET';
    }

    return fields;
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

    const items = store.configs
        .filter(
            (config) =>
                (!scope || config.scope === scope) &&
                (!kind || config.kind === kind) &&
                (!q || config.key.toLowerCase().includes(q)),
        )
        .sort((a, b) => a.key.localeCompare(b.key));

    return { status: 200, body: { items } };
}

/**
 * GET /admin/configs/{id}: карточка с исключениями или 404 NOT_FOUND.
 *
 * @param {URL} url
 * @returns {MockResponse}
 */
function getConfig(url: URL): MockResponse {
    const config = findConfig(url);
    if (!config) {
        return notFound();
    }

    const details: ConfigDetails = { ...config, overrides: store.overrides[config.id] ?? [] };
    return { status: 200, body: details };
}

/**
 * POST /admin/configs: 201 с новой записью, 400 с ошибками полей или 409 ALREADY_EXISTS.
 *
 * @param {URL} _url
 * @param {{body: *}} request
 * @returns {MockResponse}
 */
function createConfig(_url: URL, { body }: { body: unknown }): MockResponse {
    const data = body as ConfigCreate;

    const fields = validateCreate(data);
    if (Object.keys(fields).length > 0) {
        return validationError(fields);
    }

    const key = `${data.scope}.${data.name}`;
    if (store.configs.some((config) => config.key === key)) {
        return error(409, 'ALREADY_EXISTS', `Настройка ${key} уже существует`);
    }

    const timestamp = now();
    const config: Config = {
        id: Math.max(0, ...store.configs.map((item) => item.id)) + 1,
        scope: data.scope,
        name: data.name,
        key,
        kind: data.kind,
        value_type: data.value_type,
        value: data.value as ConfigValue,
        rollout_percent: data.kind === 'flag' ? (data.rollout_percent ?? null) : null,
        constraints: data.value_type === 'number' ? (data.constraints ?? null) : null,
        rollout_policy_id: null,
        rollout: null,
        client_visible: data.client_visible ?? false,
        description: data.description ?? '',
        version: 1,
        overrides_count: 0,
        created_at: timestamp,
        updated_at: timestamp,
        updated_by: ADMIN,
    };

    store.configs.push(config);
    saveStore();

    return { status: 201, body: config };
}

/**
 * PUT /admin/configs/{id}: 200 с записью после сохранения. Версия растёт на 1.
 * Поля constraints и rollout_percent, которых нет в теле, остаются прежними.
 *
 * @param {URL} url
 * @param {{body: *}} request
 * @returns {MockResponse}
 */
function updateConfig(url: URL, { body }: { body: unknown }): MockResponse {
    const config = findConfig(url);
    if (!config) {
        return notFound();
    }

    const data = body as ConfigUpdate;
    const fields = validateUpdate(config, data);
    if (Object.keys(fields).length > 0) {
        return validationError(fields);
    }

    if (data.version !== config.version) {
        return versionConflict();
    }

    if (config.kind === 'flag' && data.rollout_percent !== undefined) {
        config.rollout_percent = data.rollout_percent;
    }
    if (config.value_type === 'number' && data.constraints !== undefined) {
        config.constraints = data.constraints;
    }
    config.value = data.value;
    config.client_visible = data.client_visible;
    config.description = data.description ?? '';
    config.version += 1;
    config.updated_at = now();
    config.updated_by = ADMIN;
    saveStore();

    return { status: 200, body: config };
}

/**
 * DELETE /admin/configs/{id}?version=N: 204 или 409 VERSION_CONFLICT.
 *
 * @param {URL} url
 * @returns {MockResponse}
 */
function deleteConfig(url: URL): MockResponse {
    const config = findConfig(url);
    if (!config) {
        return notFound();
    }

    const version = Number(url.searchParams.get('version'));
    if (!Number.isInteger(version) || version < 1) {
        return validationError({ version: 'Нужна версия из последнего GET' });
    }
    if (version !== config.version) {
        return versionConflict();
    }

    store.configs = store.configs.filter((item) => item.id !== config.id);
    delete store.overrides[config.id];
    saveStore();

    return { status: 204 };
}

// mockFetch заменяет числа в пути на {id}, поэтому запрос /admin/configs/12 попадает
// в маршрут /admin/configs/{id}.
export const ADMIN_MOCK_ROUTES: Record<string, MockRoute> = {
    'GET /api/v1/admin/me': adminOnly(() => ({ status: 200, body: ADMIN })),
    'GET /api/v1/admin/scopes': adminOnly(() => ({ status: 200, body: { items: SCOPES } })),
    'GET /api/v1/admin/configs': adminOnly(listConfigs),
    'POST /api/v1/admin/configs': adminOnly(createConfig),
    'GET /api/v1/admin/configs/{id}': adminOnly(getConfig),
    'PUT /api/v1/admin/configs/{id}': adminOnly(updateConfig),
    'DELETE /api/v1/admin/configs/{id}': adminOnly(deleteConfig),
};
