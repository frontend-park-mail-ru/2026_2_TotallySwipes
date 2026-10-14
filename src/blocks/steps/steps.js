import stepsHbs from './steps.hbs';

/**
 * @param {{number: string, color: string, state: string}[]} items
 * @param {string} [mix]
 * @returns {string}
 */
export function stepsTemplate(items, mix = '') {
    return stepsHbs({
        items,
        mix,
    });
}
