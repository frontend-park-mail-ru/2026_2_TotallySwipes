/**
 * @param {{number: string, color: string, state: string}[]} items
 * @param {string} [mix]
 * @returns {string}
 */
export function stepsTemplate(items, mix = '') {
    return Handlebars.templates['steps/steps']({
        items,
        mix,
    });
}
