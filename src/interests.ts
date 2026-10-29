import type { TagKey } from './api/api.types.js';

export interface InterestData {
    key: TagKey;
    label: string;
    icon: string;
}

/**
 * Справочник интересов. key - ключ тега на бэкенде, label и icon хранит только фронтенд.
 */
export const INTERESTS: InterestData[] = [
    { key: 'coffee', label: 'Кофе', icon: 'coffee' },
    { key: 'books', label: 'Книги', icon: 'book' },
    { key: 'music', label: 'Музыка', icon: 'music' },
    { key: 'hiking', label: 'Походы', icon: 'mountain' },
    { key: 'bicycle', label: 'Велосипед', icon: 'bike' },
    { key: 'travel', label: 'Путешествия', icon: 'plane' },
    { key: 'photo', label: 'Фотография', icon: 'camera' },
    { key: 'board_games', label: 'Настолки', icon: 'game' },
    { key: 'cooking', label: 'Кулинария', icon: 'flame' },
    { key: 'running', label: 'Бег', icon: 'zap' },
    { key: 'painting', label: 'Рисование', icon: 'palette' },
    { key: 'movies', label: 'Кино', icon: 'star' },
    { key: 'concerts', label: 'Концерты', icon: 'sparkles' },
    { key: 'animals', label: 'Животные', icon: 'heart' },
];

/**
 * @param {string} key - Ключ тега с бэкенда.
 * @returns {string} Подпись интереса или сам ключ, если интерес неизвестен.
 */
export function interestLabel(key: string): string {
    return INTERESTS.find((item) => item.key === key)?.label ?? key;
}

/**
 * @param {string} key - Ключ тега с бэкенда.
 * @returns {string|null} Путь к иконке или null, если интерес неизвестен.
 */
export function interestIconUrl(key: string): string | null {
    const interest = INTERESTS.find((item) => item.key === key);

    return interest ? `/icons/${interest.icon}.svg` : null;
}
