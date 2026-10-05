/**
 * @param {Object} props
 * @returns {string} HTML чекбокса.
 */
export function checkboxTemplate(props) {
    return Handlebars.templates['checkbox/checkbox'](props);
}
