import { locationTemplate } from '../location/location.js';
import { pillTemplate } from '../pill/pill.js';

/**
 * @param {Object} profile - Анкета после toProfileView.
 * @param {string} [mix]
 * @returns {string} HTML подробной информации об анкете.
 */
export function profileDetailsTemplate(profile, mix = '') {
    const { location, interests, ...rest } = profile;

    return Handlebars.templates['profile-details/profile-details']({
        ...rest,
        mix,
        location: location ? locationTemplate('profile-details__location', location) : '',
        tags: interests.map((interest) => pillTemplate(interest, 'profile-details__tag')).join(''),
    });
}
