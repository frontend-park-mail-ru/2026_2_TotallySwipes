import type { PillData } from '../feed/feed.js';
import pillHbs from './pill.hbs';

/**
 * @param {{text: string, color?: string, icon?: string, size?: string}} pill
 * @param {string} [mix]
 * @returns {string}
 */
export function pillTemplate(pill: PillData, mix: string = ''): string {
    return pillHbs({
        ...pill,
        mix,
    });
}
