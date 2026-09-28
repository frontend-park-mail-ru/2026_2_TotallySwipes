export function roundButtonTemplate(button, mix = '') {
    return Handlebars.templates['round-button/round-button']({
        ...button,
        mix,
    });
}
