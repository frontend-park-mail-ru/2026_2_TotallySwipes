import stepsHbs from './steps.hbs';

export type StepState = 'current' | 'done' | '';

export interface StepItem {
    number: string;
    color: string;
    state: StepState;
}

/**
 * @param {{number: string, color: string, state: string}[]} items
 * @param {string} [mix]
 * @returns {string}
 */
export function stepsTemplate(items: StepItem[], mix: string = ''): string {
    return stepsHbs({
        items,
        mix,
    });
}
