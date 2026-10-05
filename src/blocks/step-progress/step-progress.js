/**
 * @param {number} current - Номер текущего шага, с 1.
 * @param {number} total
 * @returns {string}
 */
export function stepProgressTemplate(current, total) {
    const segments = Array.from({ length: total }, (_, index) => {
        if (index + 1 < current) {
            return 'done';
        }

        return index + 1 === current ? 'current' : 'todo';
    });

    return Handlebars.templates['step-progress/step-progress']({ current, total, segments });
}
