import type { LeafletMouseEvent, Marker } from 'leaflet';
import type { Coordinates } from '../api/api.types.js';

const TILES_URL = 'https://tile.openstreetmap.org/{z}/{x}/{y}.png';
const ATTRIBUTION =
    '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap</a> contributors';
const MAX_ZOOM = 19;
const FOCUS_DURATION_SECONDS = 0.3;

/**
 * Загруженная библиотека Leaflet.
 */
export type Maps = typeof import('leaflet');

let loading: Promise<Maps> | null = null;

/**
 * Загружает Leaflet и его стили один раз, отдельным чанком: пока карта не нужна, в бандл они не попадают.
 * При неудаче следующий вызов пробует загрузить снова.
 *
 * @returns Загруженная библиотека.
 * @throws {Error} Если чанк с библиотекой не загрузился.
 */
export function loadMaps(): Promise<Maps> {
    loading ??= load().catch((error) => {
        loading = null;
        throw error;
    });

    return loading;
}

async function load(): Promise<Maps> {
    const [leaflet] = await Promise.all([import('leaflet'), import('leaflet/dist/leaflet.css')]);

    return leaflet;
}

/**
 * Иконка маркера выбранной точки.
 */
export interface PickMarkerIcon {
    /** Адрес картинки. */
    url: string;
    /** Размер картинки в пикселях: ширина и высота. */
    size: [number, number];
    /** Точка картинки, которая попадает в координаты маркера: отступ слева и сверху. */
    anchor: [number, number];
    /** CSS-класс картинки. */
    className?: string;
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
    /** Иконка маркера выбранной точки. */
    markerIcon: PickMarkerIcon;
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
 * Создаёт карту OpenStreetMap с выбором точки кликом.
 *
 * @param maps - Загруженная библиотека.
 * @param container - Элемент карты. У него должен быть ненулевой размер.
 * @param options - Параметры карты.
 * @returns Управление картой.
 */
export function createPickMap(
    maps: Maps,
    container: HTMLElement,
    { center, zoom, onPick, markerIcon }: PickMapOptions,
): PickMap {
    const toLatLng = ({ latitude, longitude }: Coordinates): [number, number] => [
        latitude,
        longitude,
    ];

    const map = maps.map(container, { center: toLatLng(center), zoom });
    const icon = maps.icon({
        iconUrl: markerIcon.url,
        iconSize: markerIcon.size,
        iconAnchor: markerIcon.anchor,
        className: markerIcon.className,
    });
    let marker: Marker | null = null;

    // Префикс "Leaflet" ОБЯЗАТЕЛЬНО скрыть, а подпись OpenStreetMap по правилам OSM нужно оставить.
    map.attributionControl.setPrefix(false);
    maps.tileLayer(TILES_URL, { attribution: ATTRIBUTION, maxZoom: MAX_ZOOM }).addTo(map);

    map.on('click', (event: LeafletMouseEvent) => {
        const { lat, lng } = event.latlng.wrap();

        onPick({ latitude: lat, longitude: lng });
    });

    return {
        setPoint(coordinates) {
            if (marker) {
                marker.setLatLng(toLatLng(coordinates));
                return;
            }

            marker = maps
                .marker(toLatLng(coordinates), { icon, interactive: false, keyboard: false })
                .addTo(map);
        },

        clearPoint() {
            marker?.remove();
            marker = null;
        },

        focus(coordinates, newZoom) {
            map.setView(toLatLng(coordinates), newZoom ?? map.getZoom(), {
                animate: true,
                duration: FOCUS_DURATION_SECONDS,
            });
        },
    };
}
