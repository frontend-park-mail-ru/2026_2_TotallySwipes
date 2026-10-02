export function stepsTemplate(items, mix = '') {
    return Handlebars.templates['steps/steps']({
        items,
        mix,
    });
}
