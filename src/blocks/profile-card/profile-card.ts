import { getAllElements, getElement } from '../../dom.js';
import { type ProfileData } from '../feed/feed.js';
import { locationTemplate } from '../location/location.js';
import { changeCurrentPager, pagerTemplate } from '../pager/pager.js';
import profileCardHbs from './profile-card.hbs';

/**
 * @param {string} mix
 * @param {Object} profile - Анкета после toProfileView.
 * @returns {string} HTML карточки анкеты.
 */

interface ProfileCardData extends ProfileData {
    matchColor: string;
}

type Side = 'right' | 'left';

export function profileCardTemplate(mix: string, profile: ProfileCardData, current: number = 1) {
    const { location, ...rest } = profile;

    return profileCardHbs({
        mix: mix,
        ...rest,
        location: location ? locationTemplate('profile-card__location', location) : '',
        pager:
            profile.imgPath.length > 1
                ? pagerTemplate('profile-card__pager', current, profile.imgPath.length)
                : '',
    });
}

export function nextPhoto(card: HTMLElement, clientX: number, clientY: number) {
    const galleryElement = getElement(card, '.profile-card__gallery');
    const galleryElementRect = galleryElement.getBoundingClientRect();

    if (clientY < galleryElementRect.top || clientY > galleryElementRect.bottom) return;

    const center = galleryElementRect.left + galleryElementRect.width / 2;

    const side: Side = clientX < center ? 'left' : 'right';

    const photos = Array.from(getAllElements(galleryElement, '.profile-card__photo'));
    const visibleIndex = photos.findIndex((element) =>
        element.classList.contains('profile-card__photo_visible'),
    );
    photos[visibleIndex].classList.remove('profile-card__photo_visible');

    let nextIndex: number;

    if (side === 'right') {
        nextIndex = visibleIndex + 1 >= photos.length ? 0 : visibleIndex + 1;
    } else {
        nextIndex = visibleIndex - 1 < 0 ? photos.length - 1 : visibleIndex - 1;
    }

    photos[nextIndex].classList.add('profile-card__photo_visible');

    const pagerElement = galleryElement.querySelector('.profile-card__pager');
    if (pagerElement instanceof HTMLElement) {
        changeCurrentPager(pagerElement, nextIndex);
    }
}
