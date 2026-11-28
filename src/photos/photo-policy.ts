import { getConfigValue, subscribeToRuntimeConfig } from '../runtime-config.js';
import { PHOTO_TYPES } from '../validation.js';

const POLICY_KEY = 'profile.photo_upload_policy';
const MAX_FILE_SIZE_MB_LIMIT = 10;

/** Правила загрузки фото из OnlineConf, ключ profile.photo_upload_policy. */
export interface PhotoPolicy {
    /** Максимальный размер файла в МБ, целое число от 1 до 10. */
    max_file_size_mb: number;
    /** Разрешённые MIME-типы, непустое подмножество PHOTO_TYPES. */
    allowed_mime_types: string[];
}

/** Правила, если OnlineConf не прислал ключ или прислал некорректное значение. */
const DEFAULT_PHOTO_POLICY: PhotoPolicy = {
    max_file_size_mb: 5,
    allowed_mime_types: PHOTO_TYPES,
};

/**
 * Проверяет значение из OnlineConf по тем же правилам, что сервер.
 *
 * @param value - Значение ключа из снимка.
 * @returns true, если значением можно пользоваться.
 */
function isPhotoPolicy(value: unknown): value is PhotoPolicy {
    if (typeof value !== 'object' || value === null) {
        return false;
    }

    const { max_file_size_mb: size, allowed_mime_types: types } = value as Record<string, unknown>;

    return (
        typeof size === 'number' &&
        Number.isInteger(size) &&
        size >= 1 &&
        size <= MAX_FILE_SIZE_MB_LIMIT &&
        Array.isArray(types) &&
        types.length > 0 &&
        types.every((type) => PHOTO_TYPES.includes(type))
    );
}

/**
 * Возвращает текущие правила загрузки фото. Читать их нужно в момент проверки файла,
 * а не при открытии страницы: правила могут поменяться, пока страница открыта.
 *
 * @returns Правила из OnlineConf или правила по умолчанию.
 */
export function getPhotoPolicy(): PhotoPolicy {
    const value = getConfigValue(POLICY_KEY);
    return isPhotoPolicy(value) ? value : DEFAULT_PHOTO_POLICY;
}

/**
 * @returns Значение атрибута accept для поля выбора фото по текущим правилам.
 */
export function getPhotoAccept(): string {
    return getPhotoPolicy().allowed_mime_types.join(',');
}

/**
 * Держит accept у полей выбора фото в соответствии с текущими правилами.
 * Когда поля пропадают со страницы, подписка снимается при следующем изменении настроек.
 *
 * @param inputs - Поля выбора файла.
 */
export function bindPhotoAccept(inputs: HTMLInputElement[]): void {
    const update = () => {
        const accept = getPhotoAccept();
        inputs.forEach((input) => {
            input.accept = accept;
        });
    };

    update();

    const unsubscribe = subscribeToRuntimeConfig(() => {
        if (inputs.some((input) => input.isConnected)) {
            update();
        } else {
            unsubscribe();
        }
    });
}
