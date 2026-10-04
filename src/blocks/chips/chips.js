// type: 'radio' -- один вариант, 'checkbox' -- несколько.
// options: [{ value, label, icon?, accent? }], где icon -- путь к SVG-файлу (красится в цвет текста чипа).
// accent: mint | sun | pink | sky | lilac -- цвет выбранного чипа (по умолчанию чёрный).
// mix -- дополнительные классы на корне группы.
export function chipsTemplate({ type, name, options, mix = '' }) {
    return Handlebars.templates['chips/chips']({ type, name, options, mix });
}
