import pillHbs from './pill.hbs';
import type { AccentColor } from '../../colors.js';

/**
 * Свойства блока "Пилюля" для рендеринга.
 */
export interface PillProps {
    /** Путь к иконке в формате SVG. Если иконка не нужна, передать `null`. */
    icon: string | null;
    /** Текст. */
    text: string;
    /** Размер. Если не указан, используется размер по умолчанию. */
    size?: 's';
    /** Цвет. */
    color: AccentColor;
    /** Дополнительные CSS-классы (БЭМ-микс). */
    mix?: string;
}

/**
 * Рендерит блок "Пилюля" с необязательной иконкой и текстом.
 *
 * @param pill - Свойства пилюли для рендеринга.
 * @returns HTML-строка пилюли.
 */
export function pillTemplate(pill: PillProps): string {
    return pillHbs(pill);
}
