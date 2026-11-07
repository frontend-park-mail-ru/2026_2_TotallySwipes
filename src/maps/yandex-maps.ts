import type { LngLat } from '@yandex/ymaps3-types';
import type { Coordinates } from '../api/api.types.js';

const API_KEY = import.meta.env.VITE_YANDEX_MAPS_API_KEY;
const API_URL = 'https://api-maps.yandex.ru/v3/';

/**
 * Загруженное API Яндекс Карт -- глобальная переменная ymaps3 из @yandex/ymaps3-types.
 */
export type YandexMaps = typeof ymaps3;

type Marker = InstanceType<YandexMaps['YMapMarker']>;

let loading: Promise<YandexMaps> | null = null;

/**
 * Загружает API Яндекс Карт один раз. Если скрипт уже есть на странице, использует его.
 * При неудаче следующий вызов пробует загрузить снова.
 *
 * @returns Загруженное API.
 * @throws {Error} Если не задан ключ VITE_YANDEX_MAPS_API_KEY или скрипт не загрузился.
 */
export function loadYandexMaps(): Promise<YandexMaps> {
    loading ??= load().catch((error) => {
        loading = null;
        throw error;
    });

    return loading;
}

async function load(): Promise<YandexMaps> {
    if (!('ymaps3' in window)) {
        if (!API_KEY) {
            throw new Error('Не задан ключ Яндекс Карт (VITE_YANDEX_MAPS_API_KEY)');
        }

        await new Promise<void>((resolve, reject) => {
            const script = document.createElement('script');

            script.src = `${API_URL}?apikey=${encodeURIComponent(API_KEY)}&lang=ru_RU`;
            script.async = true;
            script.addEventListener('load', () => resolve());
            script.addEventListener('error', () =>
                reject(new Error('Не удалось загрузить Яндекс Карты')),
            );
            document.head.append(script);
        });
    }

    if (!('ymaps3' in window)) {
        throw new Error('Яндекс Карты не появились после загрузки скрипта');
    }

    await ymaps3.ready;

    return ymaps3;
}

/**
 * Параметры карты с выбором точки.
 */
export interface PickMapOptions {
    /** Центр карты при открытии. */
    center: Coordinates;
    /** Масштаб карты при открытии. */
    zoom: number;
    /** Вызывается, когда пользователь нажал на карту. */
    onPick: (coordinates: Coordinates) => void;
    /** Создаёт элемент маркера выбранной точки. */
    createMarker: () => HTMLElement;
}

/**
 * Карта, на которой пользователь выбирает точку и видит её маркер.
 */
export interface PickMap {
    /** Ставит маркер в точку или переносит его туда. */
    setPoint(coordinates: Coordinates): void;
    /** Убирает маркер. */
    clearPoint(): void;
    /** Плавно переносит центр карты. */
    focus(coordinates: Coordinates, zoom?: number): void;
}

/**
 * Создаёт карту с выбором точки кликом.
 *
 * @param maps - Загруженное API.
 * @param container - Элемент карты. У него должен быть ненулевой размер.
 * @param options - Параметры карты.
 * @returns Управление картой.
 */
export function createPickMap(
    maps: YandexMaps,
    container: HTMLElement,
    { center, zoom, onPick, createMarker }: PickMapOptions,
): PickMap {
    const toLngLat = ({ latitude, longitude }: Coordinates): LngLat => [longitude, latitude];

    const map = new maps.YMap(container, { location: { center: toLngLat(center), zoom } });
    let marker: Marker | null = null;

    map.addChild(new maps.YMapDefaultSchemeLayer({}));
    map.addChild(new maps.YMapDefaultFeaturesLayer({}));
    map.addChild(
        new maps.YMapListener({
            layer: 'any',
            onClick: (_object, event) => {
                const [longitude, latitude] = event.coordinates;

                onPick({ latitude, longitude });
            },
        }),
    );

    return {
        setPoint(coordinates) {
            if (marker) {
                marker.update({ coordinates: toLngLat(coordinates) });
                return;
            }

            marker = new maps.YMapMarker({ coordinates: toLngLat(coordinates) }, createMarker());
            map.addChild(marker);
        },

        clearPoint() {
            if (marker) {
                map.removeChild(marker);
                marker = null;
            }
        },

        focus(coordinates, newZoom) {
            map.update({
                location: { center: toLngLat(coordinates), zoom: newZoom, duration: 300 },
            });
        },
    };
}
