import locationHbs from './location.hbs';

/**
 * @param {string} mix
 * @param {string} location - Текст местоположения.
 * @returns {string}
 */
export function locationTemplate(mix, location) {
    return locationHbs({
        mix: mix,
        textLocation: location,
    });
}
