import { ApiError, getLocation, previewLocation, saveLocation } from '../../api/api.js';
import type { Coordinates, LocationPreview, UserLocation } from '../../api/api.types.js';
import { createPickMap, loadYandexMaps, type PickMap } from '../../maps/yandex-maps.js';
import { getElement } from '../../utils/dom.js';
import { setFormFieldError } from '../form-field/form-field.js';
import profileLocationHbs from './profile-location.hbs';

const DEFAULT_CENTER: Coordinates = { latitude: 55.7558, longitude: 37.6173 };
const DEFAULT_ZOOM = 10;
const SAVED_ZOOM = 12;
const LOCATED_ZOOM = 13;

const GEOLOCATION_OPTIONS: PositionOptions = { timeout: 10000 };

const NOT_SET_TEXT = 'Местоположение не задано';
const PREVIEW_TEXT = 'Определяем местоположение...';
const SAVING_TEXT = 'Сохраняем местоположение...';

const PREVIEW_ERROR =
    'Не удалось определить местоположение. Проверьте соединение и попробуйте ещё раз.';
const SAVE_ERROR =
    'Не удалось сохранить местоположение. Проверьте соединение и попробуйте ещё раз.';
const LOAD_ERROR = 'Не удалось загрузить местоположение. Обновите страницу.';
const GEOLOCATION_DENIED =
    'Нет доступа к геопозиции. Разрешите её в настройках браузера или выберите точку на карте.';
const GEOLOCATION_FAILED = 'Не удалось определить ваше положение. Выберите точку на карте.';
const GEOLOCATION_UNSUPPORTED = 'Браузер не умеет определять геопозицию. Выберите точку на карте.';

/**
 * Место, которое ещё не сохранено -- результат определения по выбранной точке.
 */
interface PendingLocation {
    preview: LocationPreview;
    coordinates: Coordinates;
}

/**
 * Рендерит блок "Геолокация": карточку с картой, определением места и его подтверждением.
 * Начинает работать после {@link initProfileLocation}.
 *
 * @returns HTML-строка карточки.
 */
export function profileLocationTemplate(): string {
    return profileLocationHbs();
}

/**
 * Параметры блока "Геолокация".
 */
export interface ProfileLocationOptions {
    /** Вызывается после того, как новое местоположение сохранено. */
    onSaved?: () => void;
}

/**
 * @param place - Город и район.
 * @returns Текст "город, район" или только город, если района нет.
 */
function formatPlace({ city, district }: { city: string; district: string | null }): string {
    return district ? `${city}, ${district}` : city;
}

/**
 * Возвращает текст ошибки: сообщение бэкенда для ошибок 4xx, иначе общий.
 *
 * @param error - Ошибка запроса.
 * @param fallback - Текст для сетевых сбоев и ошибок 5xx.
 * @returns Текст ошибки для пользователя.
 */
function errorMessage(error: unknown, fallback: string): string {
    return error instanceof ApiError && error.status < 500 ? error.message : fallback;
}

/**
 * @returns Текущая геопозиция устройства.
 * @throws {GeolocationPositionError} Если доступ запрещён или позицию определить не удалось.
 */
function getCurrentCoordinates(): Promise<Coordinates> {
    return new Promise((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(
            ({ coords }) => resolve({ latitude: coords.latitude, longitude: coords.longitude }),
            reject,
            GEOLOCATION_OPTIONS,
        );
    });
}

/**
 * Включает блок "Геолокация". Место меняется в два шага:
 * по выбранной на карте точке (или по геопозиции устройства) определяются город и район,
 * которые сохраняются только после подтверждения. Если карта не загрузилась, остаётся
 * определение по геопозиции.
 *
 * @param root - Карточка из {@link profileLocationTemplate}.
 * @param options - Параметры блока.
 */
export function initProfileLocation(root: HTMLElement, { onSaved }: ProfileLocationOptions): void {
    const mapElement = getElement(root, '.profile-location__map');
    const locateButton = getElement<HTMLButtonElement>(root, '.profile-location__locate');
    const text = getElement(root, '.profile-location__text');
    const confirmBox = getElement(root, '.profile-location__confirm');
    const okButton = getElement<HTMLButtonElement>(root, '.profile-location__ok');
    const cancelButton = getElement<HTMLButtonElement>(root, '.profile-location__cancel');

    let saved: UserLocation | null = null;
    let pending: PendingLocation | null = null;
    // Пока идёт запрос, здесь его описание для строки с местом. Новое действие начать нельзя.
    let busyText: string | null = null;
    let map: PickMap | null = null;

    render();

    getLocation()
        .then(({ location }) => {
            saved = location;
        })
        .catch((error) => {
            console.error('Не удалось загрузить местоположение:', error);
            showError(LOAD_ERROR);
        })
        .finally(() => {
            if (!root.isConnected) return;

            render();
            initMap();
        });

    locateButton.addEventListener('click', locate);
    okButton.addEventListener('click', confirm);
    cancelButton.addEventListener('click', cancel);

    function initMap() {
        const center = saved?.coordinates ?? DEFAULT_CENTER;

        loadYandexMaps()
            .then((ymaps3) => {
                if (!root.isConnected) return;

                mapElement.textContent = '';
                map = createPickMap(ymaps3, mapElement, {
                    center,
                    zoom: saved ? SAVED_ZOOM : DEFAULT_ZOOM,
                    onPick: pick,
                    createMarker: () => {
                        const marker = document.createElement('img');

                        marker.className = 'profile-location__marker';
                        marker.src = '/icons/map-marker.svg';
                        marker.alt = '';
                        marker.draggable = false;

                        return marker;
                    },
                });
                restoreMarker();
            })
            .catch((error) => {
                console.error('Не удалось показать карту:', error);
                mapElement.textContent = 'Карта недоступна';
            });
    }

    /**
     * Показывает место, ход запроса и кнопки подтверждения по текущему состоянию.
     */
    function render() {
        const place = pending?.preview ?? saved;

        text.textContent = busyText ?? (place ? formatPlace(place) : NOT_SET_TEXT);
        confirmBox.hidden = pending === null;
        locateButton.disabled = busyText !== null;
        okButton.disabled = busyText !== null;
        cancelButton.disabled = busyText !== null;
    }

    /**
     * @param message - Текст ошибки под картой. `null` убирает ошибку.
     */
    function showError(message: string | null) {
        setFormFieldError(mapElement, message);
    }

    /**
     * Возвращает маркер на сохранённое место или убирает его, если места нет.
     */
    function restoreMarker() {
        if (saved) {
            map?.setPoint(saved.coordinates);
        } else {
            map?.clearPoint();
        }
    }

    /**
     * Начинает определение места по точке, выбранной на карте.
     *
     * @param coordinates - Выбранная точка.
     */
    function pick(coordinates: Coordinates) {
        if (busyText !== null) return;

        busyText = PREVIEW_TEXT;
        requestPreview(coordinates);
    }

    /**
     * Определяет место по геопозиции устройства.
     */
    async function locate() {
        if (busyText !== null) return;

        if (!navigator.geolocation) {
            showError(GEOLOCATION_UNSUPPORTED);
            return;
        }

        busyText = PREVIEW_TEXT;
        pending = null;
        showError(null);
        render();

        try {
            const coordinates = await getCurrentCoordinates();
            if (!root.isConnected) return;

            map?.focus(coordinates, LOCATED_ZOOM);
            await requestPreview(coordinates);
        } catch (error) {
            if (!root.isConnected) return;

            const denied =
                error instanceof GeolocationPositionError && error.code === error.PERMISSION_DENIED;

            busyText = null;
            showError(denied ? GEOLOCATION_DENIED : GEOLOCATION_FAILED);
            render();
        }
    }

    /**
     * Запрашивает у бэкенда город и район точки. Вызывается, когда busyText уже выставлен.
     *
     * @param coordinates - Точка.
     */
    async function requestPreview(coordinates: Coordinates) {
        pending = null;
        showError(null);
        map?.setPoint(coordinates);
        render();

        try {
            const preview = await previewLocation(coordinates);
            if (!root.isConnected) return;

            pending = { preview, coordinates };
        } catch (error) {
            console.error('Не удалось определить местоположение:', error);
            if (!root.isConnected) return;

            showError(errorMessage(error, PREVIEW_ERROR));
            restoreMarker();
        }

        busyText = null;
        render();
    }

    /**
     * Сохраняет определённое место. Если результат устарел или бэкенд его отклонил,
     * выбор сбрасывается, а при сетевом сбое остаётся, чтобы можно было повторить.
     */
    async function confirm() {
        if (!pending || busyText !== null) return;

        busyText = SAVING_TEXT;
        showError(null);
        render();

        try {
            const { location } = await saveLocation(pending.preview.preview_id);
            if (!root.isConnected) return;

            saved = location;
            pending = null;
            restoreMarker();
            onSaved?.();
        } catch (error) {
            console.error('Не удалось сохранить местоположение:', error);
            if (!root.isConnected) return;

            showError(errorMessage(error, SAVE_ERROR));

            if (error instanceof ApiError && error.status < 500) {
                pending = null;
                restoreMarker();
            }
        }

        busyText = null;
        render();
    }

    /**
     * Отказывается от определённого места и возвращает сохранённое.
     */
    function cancel() {
        if (busyText !== null) return;

        pending = null;
        showError(null);
        restoreMarker();
        render();
    }
}
