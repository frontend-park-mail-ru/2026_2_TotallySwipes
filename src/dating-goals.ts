import type { DatingGoal } from './api/api.types.js';

export interface DatingGoalOption {
    key: DatingGoal;
    label: string;
    fact: string;
}

/**
 * Справочник целей знакомства. key - ключ на бэкенде, label - подпись выбора,
 * fact - текст в карточке анкеты.
 */
export const DATING_GOALS: DatingGoalOption[] = [
    { key: 'relationship', label: 'Отношения', fact: 'Ищу половинку' },
    { key: 'friendship', label: 'Дружба', fact: 'Ищу встречи' },
    { key: 'casual', label: 'Общение', fact: 'Ищу общение' },
];

/**
 * @param {DatingGoal | null} key - Ключ цели знакомства с бэкенда.
 * @returns {string | null} Текст для карточки анкеты или null, если цель неизвестна.
 */
export function datingGoalFact(key: DatingGoal | null): string | null {
    return DATING_GOALS.find((goal) => goal.key === key)?.fact ?? null;
}
