import { locationTemplate } from "../location/location.js";

// export function profileCardTemplate(mix, name, age, imgPath) {
export function profileCardTemplate(mix, profile) {
    const {location, ...rest} = profile;
    // const location = locationTemplate('profile-card__location', userLocation)
    return Handlebars.templates['profile-card/profile-card']({
        mix: mix,
        ...rest,
        location: locationTemplate('profile-card__location', location),
    });
}