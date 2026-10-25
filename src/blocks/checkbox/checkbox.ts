import checkboxHbs from './checkbox.hbs';

/**
 * Свойства блока "Чекбокс" для рендеринга.
 */
export interface CheckboxProps {
    /** Идентификатор input-а. */
    id: string;
    /** Имя input-а. */
    name: string;
    /** Текст. */
    text: string;
}

/**
 * Рендерит блок "Чекбокс" с подписью.
 *
 * @param props - Свойства для рендеринга чекбокса.
 * @returns HTML-строка чекбокса.
 */
export function checkboxTemplate(props: CheckboxProps): string {
    return checkboxHbs(props);
}
