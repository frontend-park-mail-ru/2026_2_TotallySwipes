import userPreviewHbs from './user-preview.hbs';

/**
 * @param {{name: string}} user
 * @param {string} [mix]
 * @returns {string}
 */
export function userPreviewTemplate(user, mix = '') {
    return userPreviewHbs({
        ...user,
        initial: user.name[0],
        mix,
    });
}
