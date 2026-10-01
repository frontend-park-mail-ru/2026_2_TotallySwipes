import { locationTemplate } from '../location/location.js';

export function profileCardTemplate(mix, profile) {
    const { location, ...rest } = profile;

    return Handlebars.templates['profile-card/profile-card']({
        mix: mix,
        ...rest,
        location: locationTemplate('profile-card__location', location),
    });
}
