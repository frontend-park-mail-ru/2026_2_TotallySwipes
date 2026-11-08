import { ApiError, deletePhoto, reorderPhotos, uploadPhoto } from '../api/api.js';
import type { Photo, PhotosResponse } from '../api/api.types.js';
import { PHOTO_MAX_COUNT, validatePhotoCount, validatePhotoFile } from '../validation.js';

const NETWORK_ERROR_MESSAGE =
    'Не удалось сохранить фото. Проверьте соединение и попробуйте ещё раз.';

/**
 * Причина, по которой при полном наборе фото замена невозможна.
 */
export const REPLACE_AT_LIMIT_MESSAGE = `В анкете уже ${PHOTO_MAX_COUNT} фото. Чтобы заменить фото, сначала удалите любое другое.`;

/**
 * Возвращает текст ошибки фото.
 *
 * @param error - Ошибка действия с фото.
 * @returns Текст ошибки для пользователя.
 */
export function photoErrorMessage(error: unknown): string {
    if (error instanceof ApiError && error.status < 500) {
        return Object.values(error.fields ?? {})[0] ?? error.message;
    }

    return NETWORK_ERROR_MESSAGE;
}

/**
 * Переносит id с одной позиции на другую.
 *
 * @param ids - Исходный порядок.
 * @param from - Позиция, с которой переносят.
 * @param to - Позиция, на которую переносят.
 * @returns Новый порядок, исходный массив не меняется.
 */
function moveId(ids: number[], from: number, to: number): number[] {
    const result = [...ids];
    const [moved] = result.splice(from, 1);
    result.splice(to, 0, moved);

    return result;
}

/**
 * Слушатель очереди фото.
 */
export interface PhotoQueueListener {
    /** Изменился список фото или число незавершённых действий. */
    onChange(): void;
    /** Действие не выполнилось. */
    onError(message: string): void;
}

/**
 * Очередь действий с фото анкеты. Действия уходят на бэкенд по одному: каждое строится
 * по актуальному списку фото, который вернул предыдущее. Пока есть незавершённые
 * действия, страница должна блокировать интерфейс фото.
 *
 * Очередь переживает страницу: слушатель можно заменить, а действия продолжат выполняться.
 */
export class PhotoQueue {
    private currentPhotos: Photo[];
    private saving = 0;
    private pending: Promise<void> = Promise.resolve();
    private listener: PhotoQueueListener | null = null;

    /**
     * @param photos - Фото анкеты на момент создания очереди, первое - главное.
     */
    constructor(photos: Photo[] = []) {
        this.currentPhotos = photos;
    }

    /**
     * Актуальный список фото по порядку, первое - главное.
     */
    get photos(): readonly Photo[] {
        return this.currentPhotos;
    }

    /**
     * Есть ли незавершённые действия.
     */
    get isSaving(): boolean {
        return this.saving > 0;
    }

    /**
     * Выполнены ли все поставленные в очередь действия. Не отклоняется: ошибки
     * действий уходят слушателю.
     */
    get idle(): Promise<void> {
        return this.pending;
    }

    /**
     * Заменяет слушателя очереди.
     *
     * @param listener - Новый слушатель.
     */
    subscribe(listener: PhotoQueueListener): void {
        this.listener = listener;
    }

    /**
     * Добавляет фото в конец списка.
     *
     * @param file - Выбранный файл.
     */
    upload(file: File): void {
        this.enqueue(async () => {
            const error =
                validatePhotoCount(this.currentPhotos.length + 1) ?? validatePhotoFile(file);

            if (error) {
                this.listener?.onError(error);
                return;
            }

            this.apply(await uploadPhoto(file));
        });
    }

    /**
     * Удаляет фото.
     *
     * @param id - id фото.
     */
    remove(id: number): void {
        this.enqueue(async () => {
            this.apply(await deletePhoto(id));
        });
    }

    /**
     * Переставляет фото.
     *
     * @param from - Позиция, с которой переносят.
     * @param to - Позиция, на которую переносят.
     */
    move(from: number, to: number): void {
        this.enqueue(async () => {
            this.apply(
                await reorderPhotos(
                    moveId(
                        this.currentPhotos.map((photo) => photo.id),
                        from,
                        to,
                    ),
                ),
            );
        });
    }

    // TODO: Пофиксить, когда бэкенд сделает PUT /api/v1/profile/me/photos/{photo_id}!
    /**
     * Заменяет фото другим файлом на том же месте. При полном наборе фото замена невозможна:
     * бэкенд не примет лишнее фото, а удалять старое до загрузки нового нельзя, оно
     * пропало бы при сбое. Тогда сообщается причина, и ничего не меняется.
     *
     * @param id - id заменяемого фото.
     * @param file - Выбранный файл.
     */
    replace(id: number, file: File): void {
        this.enqueue(async () => {
            const error = validatePhotoFile(file);

            if (error) {
                this.listener?.onError(error);
                return;
            }

            if (this.currentPhotos.length >= PHOTO_MAX_COUNT) {
                this.listener?.onError(REPLACE_AT_LIMIT_MESSAGE);
                return;
            }

            const index = this.currentPhotos.findIndex((photo) => photo.id === id);

            if (index === -1) {
                return;
            }

            this.apply(await uploadPhoto(file));
            this.apply(await deletePhoto(id));

            // Новое фото лежит в конце списка, ставим его на место старого.
            const ids = this.currentPhotos.map((photo) => photo.id);

            if (index < ids.length - 1) {
                this.apply(await reorderPhotos(moveId(ids, ids.length - 1, index)));
            }
        });
    }

    /**
     * Ставит действие в очередь.
     *
     * @param action - Запрос, меняющий фото. Ошибку запроса очередь передаёт слушателю.
     */
    private enqueue(action: () => Promise<void>): void {
        this.saving += 1;
        this.listener?.onChange();

        this.pending = this.pending.then(async () => {
            try {
                await action();
            } catch (error) {
                this.listener?.onError(photoErrorMessage(error));
            }

            this.saving -= 1;
            this.listener?.onChange();
        });
    }

    /**
     * Запоминает список фото из ответа бэкенда. Вызывается после каждого запроса,
     * чтобы список оставался верным, даже если следующий запрос действия не удался.
     *
     * @param response - Ответ бэкенда со списком фото.
     */
    private apply(response: PhotosResponse): void {
        this.currentPhotos = response.photos;
    }
}
