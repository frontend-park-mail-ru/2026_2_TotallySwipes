/**
 * @param {{type: string, size: string, icon: string, label: string, disabled?: boolean}} button
 * @param {string} [mix]
 * @returns {string}
 */
export function roundButtonTemplate(button, mix = '') {
    return Handlebars.templates['round-button/round-button']({
        ...button,
        mix,
    });
}
