import scaleHbs from './scale.hbs';

/**
 * @param {Object} scale - name, legend, color, options, captions, disabled.
 * @param {string} [mix]
 * @returns {string} HTML шкалы ответа.
 */
export function scaleTemplate(scale, mix = '') {
    return scaleHbs({
        ...scale,
        mix,
    });
}
