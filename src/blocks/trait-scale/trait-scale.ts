import traitScaleHbs from './trait-scale.hbs';
import type { AccentColor } from '../../colors.js';

const MIN_SCORE = 1;
const MAX_SCORE = 7;

export interface TraitScaleData {
    title: string;
    low: string;
    high: string;
    color: AccentColor;
    score: number;
}

/**
 * @param {TraitScaleData} trait
 * @param {string} [mix]
 * @returns {string} HTML шкалы черты. Балл ограничивается MIN_SCORE..MAX_SCORE.
 */
export function traitScaleTemplate(trait: TraitScaleData, mix: string = ''): string {
    const score = Math.min(Math.max(trait.score, MIN_SCORE), MAX_SCORE);

    return traitScaleHbs({
        ...trait,
        mix,
        score,
        min: MIN_SCORE,
        max: MAX_SCORE,
        value: score.toLocaleString('ru-RU'),
        fill: ((score - MIN_SCORE) / (MAX_SCORE - MIN_SCORE)) * 100,
    });
}
