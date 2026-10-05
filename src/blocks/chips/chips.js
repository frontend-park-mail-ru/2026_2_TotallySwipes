/**
 * Группа чипов для выбора вариантов.
 *
 * @param {Object} params
 * @param {'radio'|'checkbox'} params.type - radio - один вариант, checkbox - несколько.
 * @param {string} params.name - Имя инпутов в форме.
 * @param {{value: string, label: string, icon?: string, accent?: string}[]} params.options
 *     icon - путь к SVG, красится в цвет текста чипа.
 *     accent - цвет выбранного чипа: mint, sun, pink, sky, lilac (по умолчанию чёрный).
 * @param {string} [params.mix] - Дополнительные классы на корне группы.
 * @returns {string}
 */
export function chipsTemplate({ type, name, options, mix = '' }) {
    return Handlebars.templates['chips/chips']({ type, name, options, mix });
}
