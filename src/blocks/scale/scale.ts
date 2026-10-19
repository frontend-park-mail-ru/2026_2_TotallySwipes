import scaleHbs from './scale.hbs';

export interface ScaleOption {
    value: number;
    label: string;
    checked: boolean;
}

export interface ScaleCaption {
    text: string;
    align: 'start' | 'center' | 'end';
}

export interface ScaleData {
    name: string;
    legend: string;
    color: string;
    options: ScaleOption[];
    captions: ScaleCaption[];
    disabled: boolean;
}

/**
 * @param {Object} scale - name, legend, color, options, captions, disabled.
 * @param {string} [mix]
 * @returns {string} HTML шкалы ответа.
 */
export function scaleTemplate(scale: ScaleData, mix: string = ''): string {
    return scaleHbs({
        ...scale,
        mix,
    });
}
