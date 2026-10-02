import { locationTemplate } from '../location/location.js';
import { pillTemplate } from '../pill/pill.js';

export function profileDetailsTemplate(profile, mix = '') {
    const { location, interests, ...rest } = profile;

    return Handlebars.templates['profile-details/profile-details']({
        ...rest,
        mix,
        location: location ? locationTemplate('profile-details__location', location) : '',
        tags: interests.map((interest) => pillTemplate(interest, 'profile-details__tag')).join(''),
    });
}
