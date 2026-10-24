import type { Attitude, DatingGoal, Education, UserFacts } from '../api/api.types.js';

export interface DatingGoalOption {
    key: DatingGoal;
    label: string;
    fact: string;
}

export interface FactsOption {
    key: Education | Attitude;
    label: string;
}

export interface FactData {
    label: string;
    value: string | null;
}

export const ATTITUDES: FactsOption[] = [
    { key: 'negative', label: 'Негативное' },
    { key: 'neutral', label: 'Нейтральное' },
    { key: 'positive', label: 'Позитивное' },
];

export const EDUCATIONS: FactsOption[] = [
    { key: 'secondary', label: 'Среднее' },
    { key: 'vocational', label: 'Среднее профессиональное' },
    { key: 'incomplete_higher', label: 'Незаконченное высшее' },
    { key: 'higher', label: 'Высшее' },
];

export const SEARCH_SEX_OPTIONS = [
    { value: 'female', label: 'Девушек' },
    { value: 'male', label: 'Парней' },
    { value: 'all', label: 'Всех' },
];

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

export function EducationFact(key: Education | null): string | null {
    return EDUCATIONS.find((goal) => goal.key === key)?.label ?? null;
}
export function AttitudeFact(key: Attitude | null): string | null {
    return ATTITUDES.find((goal) => goal.key === key)?.label ?? null;
}

export function processFacts(facts: UserFacts): FactData[] {
    return [
        { label: 'Цель', value: datingGoalFact(facts.dating_goal) },
        { label: 'Рост', value: facts.height ? String(facts.height) + ' см' : null },
        { label: 'Работа', value: facts.work },
        { label: 'Образование', value: EducationFact(facts.education) },
        { label: 'Курение', value: AttitudeFact(facts.smoking) },
        { label: 'Алкоголь', value: AttitudeFact(facts.alcohol) },
    ].filter((fact) => fact.value);
}
