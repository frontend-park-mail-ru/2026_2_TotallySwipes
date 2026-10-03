export function scaleTemplate(scale, mix = '') {
    return Handlebars.templates['scale/scale']({
        ...scale,
        mix,
    });
}
