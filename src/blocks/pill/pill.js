export function pillTemplate(pill, mix = '') {
    return Handlebars.templates['pill/pill']({
        ...pill,
        mix,
    });
}
