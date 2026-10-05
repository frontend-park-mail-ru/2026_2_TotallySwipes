/**
 * @param {{name: string}} user
 * @param {string} [mix]
 * @returns {string}
 */
export function userPreviewTemplate(user, mix = '') {
    return Handlebars.templates['user-preview/user-preview']({
        ...user,
        initial: user.name[0],
        mix,
    });
}
