/**
 * Справочник целей знакомства. key - ключ на бэкенде, label - подпись выбора,
 * fact - текст в карточке анкеты.
 */
export const DATING_GOALS = [
    { key: 'relationship', label: 'Отношения', fact: 'Ищу половинку' },
    { key: 'friendship', label: 'Дружба', fact: 'Ищу встречи' },
    { key: 'casual', label: 'Общение', fact: 'Ищу общение' },
];

/**
 * @param {string} key - Ключ цели знакомства с бэкенда.
 * @returns {string|null} Текст для карточки анкеты или null, если цель неизвестна.
 */
export function datingGoalFact(key) {
    return DATING_GOALS.find((goal) => goal.key === key)?.fact ?? null;
}
