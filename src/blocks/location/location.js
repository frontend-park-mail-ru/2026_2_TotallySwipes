/**
 * @param {string} mix
 * @param {string} location - Текст местоположения.
 * @returns {string}
 */
export function locationTemplate(mix, location) {
    return Handlebars.templates['location/location']({
        mix: mix,
        textLocation: location,
    });
}
