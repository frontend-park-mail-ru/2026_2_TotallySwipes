import type { Attitude, DatingGoal, Education, UserFacts } from '../api/api.types.js';

export interface DatingGoalOption {
    key: DatingGoal;
    label: string;
}

export interface FactsOption<Key extends string = Education | Attitude> {
    key: Key;
    label: string;
}

export interface FactData {
    label: string;
    value: string | null;
}

export const SMOKING_OPTIONS: FactsOption<Attitude>[] = [
    { key: 'negative', label: 'Не курю' },
    { key: 'neutral', label: 'Иногда' },
    { key: 'positive', label: 'Курю' },
];

export const ALCOHOL_OPTIONS: FactsOption<Attitude>[] = [
    { key: 'negative', label: 'Не пью' },
    { key: 'neutral', label: 'Иногда' },
    { key: 'positive', label: 'Пью' },
];

export const EDUCATIONS: FactsOption<Education>[] = [
    { key: 'secondary', label: 'Среднее' },
    { key: 'vocational', label: 'Среднее профессиональное' },
    { key: 'incomplete_higher', label: 'Незаконченное высшее' },
    { key: 'higher', label: 'Высшее' },
    { key: 'degree', label: 'Учёная степень' },
];

export const SEARCH_SEX_OPTIONS = [
    { value: 'female', text: 'Девушек' },
    { value: 'male', text: 'Парней' },
    { value: 'all', text: 'Всех' },
];

/**
 * Справочник целей знакомства. key - ключ на бэкенде, label - подпись выбора
 * и текст в карточке анкеты.
 */
export const DATING_GOALS: DatingGoalOption[] = [
    { key: 'relationship', label: 'Отношения' },
    { key: 'friendship', label: 'Дружба' },
    { key: 'casual', label: 'Общение' },
];

/**
 * @param {DatingGoal | null} key - Ключ цели знакомства с бэкенда.
 * @returns {string | null} Подпись цели или null, если цель неизвестна.
 */
export function datingGoalFact(key: DatingGoal | null): string | null {
    return DATING_GOALS.find((goal) => goal.key === key)?.label ?? null;
}

export function EducationFact(key: Education | null): string | null {
    return EDUCATIONS.find((goal) => goal.key === key)?.label ?? null;
}

/**
 * @param {FactsOption<Attitude>[]} options - Справочник поля: SMOKING_OPTIONS или ALCOHOL_OPTIONS.
 * @param {Attitude | null} key - Отношение с бэкенда.
 * @returns {string | null} Подпись или null, если отношение неизвестно.
 */
export function AttitudeFact(
    options: FactsOption<Attitude>[],
    key: Attitude | null,
): string | null {
    return options.find((option) => option.key === key)?.label ?? null;
}

export function processFacts(facts: UserFacts): FactData[] {
    return [
        { label: 'Цель знакомства', value: datingGoalFact(facts.dating_goal) },
        { label: 'Рост', value: facts.height ? String(facts.height) + ' см' : null },
        { label: 'Работа', value: facts.work },
        { label: 'Образование', value: EducationFact(facts.education) },
        { label: 'Курение', value: AttitudeFact(SMOKING_OPTIONS, facts.smoking) },
        { label: 'Алкоголь', value: AttitudeFact(ALCOHOL_OPTIONS, facts.alcohol) },
    ].filter((fact) => fact.value);
}
