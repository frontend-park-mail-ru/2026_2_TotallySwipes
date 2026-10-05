const MIN_SCORE = 1;
const MAX_SCORE = 7;

/**
 * @param {{title: string, low: string, high: string, color: string, score: number}} trait
 * @param {string} [mix]
 * @returns {string} HTML шкалы черты. Балл ограничивается MIN_SCORE..MAX_SCORE.
 */
export function traitScaleTemplate(trait, mix = '') {
    const score = Math.min(Math.max(trait.score, MIN_SCORE), MAX_SCORE);

    return Handlebars.templates['trait-scale/trait-scale']({
        ...trait,
        mix,
        score,
        min: MIN_SCORE,
        max: MAX_SCORE,
        value: score.toLocaleString('ru-RU'),
        fill: ((score - MIN_SCORE) / (MAX_SCORE - MIN_SCORE)) * 100,
    });
}
