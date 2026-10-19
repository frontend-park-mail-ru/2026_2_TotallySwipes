import { ProfileData } from '../feed/feed.js';
import { locationTemplate } from '../location/location.js';
import profileCardHbs from './profile-card.hbs';

/**
 * @param {string} mix
 * @param {Object} profile - Анкета после toProfileView.
 * @returns {string} HTML карточки анкеты.
 */

interface ProfileCardData extends ProfileData {
    matchColor: string;
}
export function profileCardTemplate(mix: string, profile: ProfileCardData) {
    const { location, ...rest } = profile;

    return profileCardHbs({
        mix: mix,
        ...rest,
        location: locationTemplate('profile-card__location', location),
    });
}
