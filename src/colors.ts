/**
 * Список акцентных цветов палитры в порядке по умолчанию.
 *
 * Значения элементов массива строго совпадают с переменными `$color-accent-*`
 * в `variables.scss`. При изменении этого списка необходимо синхронно обновить
 * стили в SCSS.
 */
export const ACCENT_COLORS = ['pink', 'sky', 'lilac', 'mint', 'sun'] as const;

/**
 * Тип акцентного цвета палитры.
 *
 * Автоматически вычисляется на основе элементов массива {@link ACCENT_COLORS}.
 */
export type AccentColor = (typeof ACCENT_COLORS)[number];
