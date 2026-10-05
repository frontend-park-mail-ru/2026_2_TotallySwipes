/**
 * @param {{text: string, color?: string, icon?: string, size?: string}} pill
 * @param {string} [mix]
 * @returns {string}
 */
export function pillTemplate(pill, mix = '') {
    return Handlebars.templates['pill/pill']({
        ...pill,
        mix,
    });
}
