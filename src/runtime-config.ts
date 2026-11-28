import { getClientConfig } from './api/api.js';
import type { ClientConfig } from './api/api.types.js';

// Настройки OnlineConf для продукта. Модуль хранит последний корректный ответ GET /config,
// обновляет его раз в 20 с, при возврате во вкладку и при появлении сети,
// и сообщает подписчикам, когда значения изменились.
// Опрос идёт только пока пользователь вошёл: index.ts вызывает start при входе и stop при выходе.

const POLL_INTERVAL_MS = 20_000;
const REQUEST_TIMEOUT_MS = 5_000;

/** Запрос, который сейчас выполняется. */
interface PendingRequest {
    /** Номер сессии, для которой отправлен запрос. */
    session: number;
    /** Завершается, когда ответ обработан. */
    promise: Promise<void>;
}

let snapshot: ClientConfig | null = null;
let running = false;
// Растёт при каждом start и stop. Ответ, пришедший для прошлой сессии, отбрасывается.
let session = 0;
let pollTimer: ReturnType<typeof setInterval> | undefined;
let pending: PendingRequest | null = null;
const listeners = new Set<() => void>();

/**
 * Проверяет форму ответа, чтобы сломанный ответ не заменил рабочий снимок.
 *
 * @param {*} data
 * @returns {boolean}
 */
function isClientConfig(data: unknown): data is ClientConfig {
    if (typeof data !== 'object' || data === null) {
        return false;
    }

    const { revision, flags, config } = data as Record<string, unknown>;
    const isObject = (value: unknown) =>
        typeof value === 'object' && value !== null && !Array.isArray(value);

    return (
        typeof revision === 'number' &&
        isObject(flags) &&
        Object.values(flags as object).every((value) => typeof value === 'boolean') &&
        isObject(config)
    );
}

/**
 * Возвращает флаг из снимка. Значение по умолчанию берётся, только если ключа нет:
 * явное false из OnlineConf остаётся выключением.
 *
 * @param {string} key - scope.name, например 'matching.timepad_enabled'.
 * @param {boolean} defaultValue - Поведение продукта, если OnlineConf не прислал флаг.
 * @returns {boolean}
 */
export function getFlag(key: string, defaultValue: boolean): boolean {
    const value = snapshot?.flags[key];
    return typeof value === 'boolean' ? value : defaultValue;
}

/**
 * Возвращает значение конфига из снимка как есть. Проверять его и подставлять значение
 * по умолчанию должен код, который им пользуется: только он знает нужную форму.
 *
 * @param {string} key - scope.name, например 'profile.photo_upload_policy'.
 * @returns {*} Значение или undefined, если ключа нет.
 */
export function getConfigValue(key: string): unknown {
    return snapshot?.config[key];
}

/**
 * Подписывает на изменение настроек. Вызывается, когда значения действительно поменялись,
 * в том числе при очистке снимка после выхода.
 *
 * @param {Function} listener
 * @returns {Function} Отписка. Её нужно вызвать, когда страница уходит.
 */
export function subscribeToRuntimeConfig(listener: () => void): () => void {
    listeners.add(listener);
    return () => listeners.delete(listener);
}

function notify() {
    listeners.forEach((listener) => listener());
}

/**
 * Загружает настройки и обновляет снимок, если ответ корректный, относится к текущей сессии
 * и что-то изменилось. Сравниваются значения, а не только revision: после смены пользователя
 * revision тот же, а флаги другие. При ошибке остаётся прежний снимок.
 *
 * @param {number} requestSession - Сессия, для которой отправлен запрос.
 * @returns {Promise<void>}
 */
async function load(requestSession: number): Promise<void> {
    try {
        const next = await getClientConfig(AbortSignal.timeout(REQUEST_TIMEOUT_MS));
        if (requestSession !== session) {
            return;
        }
        if (!isClientConfig(next)) {
            console.warn('OnlineConf прислал ответ неожиданной формы, оставлен прежний снимок');
            return;
        }
        if (JSON.stringify(next) === JSON.stringify(snapshot)) {
            return;
        }

        snapshot = next;
        notify();
    } catch (error) {
        console.warn('Не удалось обновить настройки OnlineConf, оставлен прежний снимок:', error);
    }
}

/**
 * Внеочередное обновление, например после ответа FEATURE_DISABLED. Пока идёт запрос
 * для текущей сессии, второй не отправляется: возвращается тот же промис.
 *
 * @returns {Promise<void>}
 */
export function refreshRuntimeConfig(): Promise<void> {
    if (!running) {
        return Promise.resolve();
    }
    if (pending && pending.session === session) {
        return pending.promise;
    }

    const request: PendingRequest = { session, promise: load(session) };
    pending = request;
    request.promise.finally(() => {
        if (pending === request) {
            pending = null;
        }
    });

    return request.promise;
}

/**
 * Запускает опрос для вошедшего пользователя. Повторный вызов только обновляет снимок.
 *
 * @returns {Promise<void>} Завершается после первого ответа.
 */
export function startRuntimeConfig(): Promise<void> {
    if (!running) {
        running = true;
        session++;
        pollTimer = setInterval(refreshRuntimeConfig, POLL_INTERVAL_MS);
    }

    return refreshRuntimeConfig();
}

/**
 * Останавливает опрос и очищает снимок при выходе. Ответ, который ещё в пути, не применится.
 */
export function stopRuntimeConfig(): void {
    if (!running) {
        return;
    }

    running = false;
    session++;
    clearInterval(pollTimer);
    pending = null;

    if (snapshot) {
        snapshot = null;
        notify();
    }
}

document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
        refreshRuntimeConfig();
    }
});
window.addEventListener('online', () => {
    refreshRuntimeConfig();
});
