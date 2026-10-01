export function locationTemplate(mix, location) {
    return Handlebars.templates['location/location']({
        mix: mix,
        textLocation: location,
    });
}
