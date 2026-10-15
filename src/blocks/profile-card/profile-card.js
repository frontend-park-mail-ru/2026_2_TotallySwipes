import { locationTemplate } from '../location/location.js';
import profileCardHbs from './profile-card.hbs';

/**
 * @param {string} mix
 * @param {Object} profile - Анкета после toProfileView.
 * @returns {string} HTML карточки анкеты.
 */
export function profileCardTemplate(mix, profile) {
    const { location, ...rest } = profile;

    return profileCardHbs({
        mix: mix,
        ...rest,
        location: locationTemplate('profile-card__location', location),
    });
}
