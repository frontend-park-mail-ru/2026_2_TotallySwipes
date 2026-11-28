import { getFlag } from './runtime-config.js';

// Флаги OnlineConf, которые читает продукт. Значение по умолчанию -- поведение, если флага нет
// в ответе /config: продукт работает так же, как до появления флага.

/**
 * Можно ли начать новый подбор мест через Timepad. Уже начатый подбор открывается всегда.
 *
 * @returns {boolean}
 */
export function isPlaceSearchEnabled(): boolean {
    return getFlag('matching.timepad_enabled', true);
}
