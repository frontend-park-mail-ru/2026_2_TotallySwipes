import type { ProfileShort } from '../../api/api.types.js';
import userPreviewHbs from './user-preview.hbs';

/**
 * @param {{name: string}} user
 * @param {string} [mix]
 * @returns {string}
 */
export function userPreviewTemplate(user: ProfileShort, mix: string = ''): string {
    return userPreviewHbs({
        ...user,
        initial: user.name?.[0] ?? '',
        mix,
    });
}
