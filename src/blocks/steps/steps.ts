import type { AccentColor } from '../../colors.js';
import { padWithZeros } from '../../utils/format.js';
import stepsHbs from './steps.hbs';

/**
 * Состояние шага: `done` - пройденный, `current` - текущий,
 * `todo` - ещё не пройденный.
 */
export type StepState = 'done' | 'current' | 'todo';

/**
 * Свойства одного шага для рендеринга.
 */
export interface StepProps {
    /** Номер, начиная с 1. Отображается с ведущим нулём. */
    number: number;
    /** Состояние. */
    state: StepState;
    /** Цвет: акцентный цвет палитры или `primary` (нейтральный, цвет основного текста). */
    color: AccentColor | 'primary';
}

/**
 * Свойства группы шагов для рендеринга.
 */
export interface StepsProps {
    /** Шаги в порядке отображения. */
    items: StepProps[];
    /**
     * Являются кликабельными? Если да, шаги рендерятся как `<button>`
     * с атрибутом `data-index`, на которые нужно навесить обработчики,
     * иначе как `<span>`.
     */
    isInteractive: boolean;
    /** Дополнительные CSS-классы (БЭМ-микс) на корне блока. */
    mix?: string;
}

/**
 * Рендерит блок "Шаги" (= группа шагов) - полоски с номерами и отметками
 * пройденных шагов.
 *
 * @param props - Свойства для рендеринга группы шагов.
 * @returns HTML-строка группы шагов.
 */
export function stepsTemplate(props: StepsProps): string {
    return stepsHbs({
        ...props,
        items: props.items.map((item) => ({
            ...item,
            number: padWithZeros(item.number),
        })),
        itemTag: props.isInteractive ? 'button' : 'span',
    });
}
