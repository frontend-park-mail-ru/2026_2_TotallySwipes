import chipsHbs from './chips.hbs';
import type { AccentColor } from '../../colors.js';

/**
 * Свойства одного чипа для рендеринга.
 */
export interface ChipProps {
    /** Значение input-а. */
    value: string;
    /**
     * Путь к иконке в формате SVG. Красится в цвет текста чипа.
     * Если иконка не нужна, не указывать или передать `null`.
     */
    icon?: string | null;
    /** Текст. */
    text: string;
    /** Цвет выбранного чипа. Если не указан, используется чёрный цвет. */
    color?: AccentColor;
}

/**
 * Свойства группы чипов для рендеринга.
 */
export interface ChipsProps {
    /** Имя input-ов. */
    name: string;
    /** Тип input-ов: `radio` - один вариант, `checkbox` - несколько вариантов. */
    type: 'radio' | 'checkbox';
    /** Чипы в группе. */
    chips: ChipProps[];
    /** Дополнительные CSS-классы (БЭМ-микс) на корне группы. */
    mix?: string;
}

/**
 * Рендерит блок "Чипы" (= группу чипов).
 *
 * @param props - Свойства для рендеринга группы чипов.
 * @returns HTML-строка группы чипов.
 */
export function chipsTemplate(props: ChipsProps): string {
    return chipsHbs(props);
}
