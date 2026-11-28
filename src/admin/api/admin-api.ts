import { ApiError, request } from '../../api/api.js';
import type {
    Config,
    ConfigCreate,
    ConfigDetails,
    ConfigsFilter,
    ConfigUpdate,
    Override,
    OverrideUpsert,
    ItemsResponse,
    ScopeInfo,
    UserRef,
} from './admin-api.types.js';

const ADMIN = '/admin';

/**
 * Проверяет, что запрос отклонён из-за отсутствия прав администратора.
 * Ошибку CSRF_INVALID с тем же статусом 403 не считает отказом в доступе.
 *
 * @param {*} error - Ошибка из запроса к админскому API.
 * @returns {boolean} true, если бэкенд ответил 403 FORBIDDEN.
 */
export function isForbidden(error: unknown): boolean {
    return error instanceof ApiError && error.status === 403 && error.code === 'FORBIDDEN';
}

/**
 * Возвращает текущего администратора. Админка вызывает этот запрос первым при запуске:
 * 401 означает, что нужен вход, 403 -- что у пользователя нет прав.
 *
 * @returns {Promise<UserRef>} ID и email администратора.
 * @throws {ApiError}
 */
export function getAdminMe(): Promise<UserRef> {
    return request<UserRef>(`${ADMIN}/me`);
}

/**
 * Возвращает список scope для фильтра в списке и выпадающего списка в форме.
 *
 * @returns {Promise<ScopeInfo[]>}
 * @throws {ApiError}
 */
export async function listScopes(): Promise<ScopeInfo[]> {
    const { items } = await request<ItemsResponse<ScopeInfo>>(`${ADMIN}/scopes`);
    return items;
}

/**
 * Возвращает конфиги и флаги, отсортированные по ключу. Пустые фильтры не отправляются.
 *
 * @param {ConfigsFilter} [filter]
 * @param {Scope} [filter.scope] - Только записи этого scope.
 * @param {ConfigKind} [filter.kind] - Только флаги или только конфиги.
 * @param {string} [filter.q] - Подстрока в ключе `scope.name`, регистр не учитывается.
 * @returns {Promise<Config[]>}
 * @throws {ApiError}
 */
export async function listConfigs(filter: ConfigsFilter = {}): Promise<Config[]> {
    // buildUrl пропускает только undefined и null, поэтому пустую строку тоже превращаем в undefined.
    const search = filter.q?.trim();
    const q = search ? search : undefined;

    const { items } = await request<ItemsResponse<Config>>(`${ADMIN}/configs`, {
        query: { scope: filter.scope, kind: filter.kind, q },
    });
    return items;
}

/**
 * Возвращает карточку конфига или флага с персональными исключениями.
 *
 * @param {number} configId
 * @returns {Promise<ConfigDetails>}
 * @throws {ApiError} 404 NOT_FOUND, если настройки нет или она удалена.
 */
export function getConfig(configId: number): Promise<ConfigDetails> {
    return request<ConfigDetails>(`${ADMIN}/configs/${configId}`);
}

/**
 * Создаёт конфиг или флаг.
 *
 * @param {ConfigCreate} data
 * @returns {Promise<Config>} Созданная запись, по её id можно открыть карточку.
 * @throws {ApiError} 400 VALIDATION_ERROR с ошибками в fields, 409 ALREADY_EXISTS, если scope.name занят.
 */
export function createConfig(data: ConfigCreate): Promise<Config> {
    return request<Config>(`${ADMIN}/configs`, { method: 'POST', body: data });
}

/**
 * Сохраняет изменения настройки. В data.version передаётся версия из последнего GET.
 *
 * @param {number} configId
 * @param {ConfigUpdate} data
 * @returns {Promise<Config>} Запись после сохранения, с новой версией.
 * @throws {ApiError} 400 VALIDATION_ERROR, 404 NOT_FOUND, 409 VERSION_CONFLICT, если запись уже изменили.
 */
export function updateConfig(configId: number, data: ConfigUpdate): Promise<Config> {
    return request<Config>(`${ADMIN}/configs/${configId}`, { method: 'PUT', body: data });
}

/**
 * Удаляет настройку. Продукт после этого берёт значение по умолчанию из кода.
 *
 * @param {number} configId
 * @param {number} version - Версия из последнего GET.
 * @returns {Promise<null>} У ответа 204 тела нет.
 * @throws {ApiError} 404 NOT_FOUND, 409 VERSION_CONFLICT, если запись уже изменили.
 */
export function deleteConfig(configId: number, version: number): Promise<null> {
    return request<null>(`${ADMIN}/configs/${configId}`, {
        method: 'DELETE',
        query: { version },
    });
}

/**
 * Принудительно включает или выключает флаг одному пользователю. Если исключение
 * для этого пользователя уже есть, меняет у него enabled. Глобальное выключение
 * (value = false) сильнее любого исключения.
 *
 * @param {number} configId - ID флага.
 * @param {OverrideUpsert} data - user_id или email и решение enabled.
 * @returns {Promise<Override>} Сохранённое исключение.
 * @throws {ApiError} 400 NOT_A_FLAG, TOO_MANY_OVERRIDES или VALIDATION_ERROR,
 * 404 NOT_FOUND или USER_NOT_FOUND.
 */
export function upsertOverride(configId: number, data: OverrideUpsert): Promise<Override> {
    return request<Override>(`${ADMIN}/configs/${configId}/overrides`, {
        method: 'POST',
        body: data,
    });
}

/**
 * Удаляет исключение. Пользователь снова попадает под процент раскатки.
 * Если исключения не было, сервер всё равно отвечает 204.
 *
 * @param {number} configId - ID флага.
 * @param {number} userId
 * @returns {Promise<null>} У ответа 204 тела нет.
 * @throws {ApiError} 404 NOT_FOUND, если флага нет.
 */
export function deleteOverride(configId: number, userId: number): Promise<null> {
    return request<null>(`${ADMIN}/configs/${configId}/overrides/${userId}`, {
        method: 'DELETE',
    });
}
