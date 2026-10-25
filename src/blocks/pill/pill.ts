import pillHbs from './pill.hbs';
import type { PillData } from '../feed/feed.js';

/**
 * Свойства блока "Пилюля" для рендеринга.
 */
export interface PillProps extends PillData {
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
