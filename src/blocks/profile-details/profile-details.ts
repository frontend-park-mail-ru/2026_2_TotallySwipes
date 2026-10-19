import { ProfileData } from '../feed/feed.js';
import { locationTemplate } from '../location/location.js';
import { pillTemplate } from '../pill/pill.js';
import profileDetailsHbs from './profile-details.hbs';

/**
 * @param {Object} profile - Анкета после toProfileView.
 * @param {string} [mix]
 * @returns {string} HTML подробной информации об анкете.
 */
export function profileDetailsTemplate(profile: ProfileData, mix: string = '') {
    const { location, interests, ...rest } = profile;

    return profileDetailsHbs({
        ...rest,
        mix,
        location: location ? locationTemplate('profile-details__location', location) : '',
        tags: interests.map((interest) => pillTemplate(interest, 'profile-details__tag')).join(''),
    });
}
