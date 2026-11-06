import { ticketTemplate, type TicketData } from '../ticket/ticket';
import { PHOTO_PLACEHOLDER } from '../../icons';
import { formatEventDate } from '../../utils/format';
import placeSearchHbs from './place-search.hbs';
import placeSearchMatchesHbs from './__matches/place-search__matches.hbs';
import { emptyStateTemplate, type EmptyStateData } from '../empty-state/empty-state';
import { getElement } from '../../utils/dom';
import { initStack, updateLayers } from '../swipe-stack/swipe-stack';
import type {
    EventSearchStatus,
    EventsPage,
    Location,
    PlaceEvent,
    uuid,
} from '../../api/api.types';
import type { RouteParams, Router } from '../../router';
import { showModal } from '../modal/modal';
import { ApiError, createPlaceSearch, getCurrentUser, sendPlaceSearchResults } from '../../api/api';
import {
    clearDraft,
    loadDraft,
    saveDraft,
    type Decision,
} from '../../storage/place-search-storage';
import { roundButtonTemplate, type RoundButtonData } from '../round-button/round-button';
import { pillTemplate } from '../pill/pill';

interface SearchState {
    searchId: uuid;
    status: EventSearchStatus;
    events: PlaceEvent[];
    userLikedEventIds: number[] | null;
    userFinished: boolean;
    partnerFinished: boolean;
    matches: PlaceEvent[];
}

interface PlaceSearchState {
    userId: number | null;
    matchId: number;
    city: Location['city'] | null;
    search: SearchState | null;
    decisions: Decision[];
}

const ACTIONS: RoundButtonData[] = [
    { type: 'undo', size: 's', icon: '/icons/undo.svg', label: 'Вернуть' },
    { type: 'dislike', size: 'l', icon: '/icons/x.svg', label: 'Не нравится' },
    { type: 'like', size: 'l', icon: '/icons/heart_filled.svg', label: 'Нравится' },
];

export const WAITING_STATE: EmptyStateData = {
    image: '/icons/ticket-waiting.svg',
    title: 'Ждём партнёра',
    text: 'Вы оценили все 10 мест. Когда партнёр закончит, покажем места, которые понравились вам обоим, и пришлём уведомление.',
    actions: [{ text: 'К симпатиям', view: 'primary', href: '/matches' }],
    size: 'l',
    sticker: true,
    mix: 'place-search__empty',
};

export const NO_MATCHES_STATE: EmptyStateData = {
    image: '/icons/ticket-sad.svg',
    title: 'Ни одно место не совпало',
    text: 'Из 10 мест у вас не нашлось общего. Можно договориться в переписке.',
    actions: [
        { text: 'Написать', view: 'primary', icon: '/icons/chat.svg', disabled: true },
        { text: 'К симпатиям', view: 'outline', href: '/matches' },
    ],
    size: 'l',
    sticker: true,
    mix: 'place-search__empty',
};

const ERROR_MODAL = {
    image: '/icons/mascot-error.svg',
    title: 'Произошла ошибка',
    text: 'Похоже, что пропала связь. Попробуйте ещё раз.',
    buttonText: 'Повторить',
};

const NO_CITY_MODAL = {
    image: '/icons/mascot-error.svg',
    title: 'Не указан город',
    text: 'Похоже, что у вас не указан город, поэтому подбор событий недоступен. Пожалуйста, укажите его в профиле',
    buttonText: 'К совпадениям',
};

const EXPIRED_MODAL = {
    image: '/icons/mascot-error.svg',
    title: 'Подбор истёк',
    text: 'Подбор действует 24 часа. Начните новый со страницы симпатий.',
    buttonText: 'К симпатиям',
};

const SEARCH_ALREADY_ACTIVE_MODAL = {
    image: '/icons/mascot-error.svg',
    title: 'Подбор уже идёт',
    buttonText: 'К симпатиям',
};

const NO_EVENTS_MODAL = {
    image: '/icons/mascot-error.svg',
    title: 'Не нашли событий',
    text: 'Похоже, что мы не смогли найти событий в вашем городе, попробуйте позднее.',
    buttonText: 'К совпадениям',
};

function toPlaceSearchView(data: EventsPage): SearchState {
    return {
        searchId: data.search_id,
        status: data.status,
        events: data.events,
        userLikedEventIds: data.current_user_liked_event_ids,
        userFinished: data.current_user_finished,
        partnerFinished: data.partner_finished,
        matches: data.matches,
    };
}

/**
 * Переводит событие из ответа API в данные для шаблона билета.
 *
 * @param {Object} event - Событие из подбора.
 * @returns {Object}
 */
function toTicketView(event: PlaceEvent): TicketData {
    const startsAt = formatEventDate(event.starts_at);

    return {
        id: event.id,
        title: event.name,
        photoUrl: event.image_url ?? PHOTO_PLACEHOLDER,
        time: startsAt.time,
        date: startsAt.date,
        city: event.location.city,
        address: event.location.address,
        url: event.url,
    };
}

function validDecisions(draft: Decision[], events: PlaceEvent[]): Decision[] {
    const mismatch = draft.findIndex((decision, index) => decision?.id !== events[index]?.id);
    return mismatch === -1 ? draft : draft.slice(0, mismatch);
}

function fillStack(stackElement: HTMLElement, state: PlaceSearchState) {
    while (stackElement.children.length < 3) {
        const nextIndex = state.decisions.length + stackElement.children.length;
        if (!state.search?.events[nextIndex]) break;

        const html = ticketTemplate(
            'swipe-stack__card',
            toTicketView(state.search.events[nextIndex]),
        );
        stackElement.insertAdjacentHTML('afterbegin', html);
    }
}

export function renderPlaceSearchPage(root: HTMLElement, router: Router, params: RouteParams) {
    const page = document.createElement('section');
    page.className = 'place-search';

    root.append(page);

    page.innerHTML = placeSearchHbs({
        actions: ACTIONS.map((action) => roundButtonTemplate(action)).join(''),
    });
    const stackElement = getElement(page, '.place-search__stack');
    const counterElement = getElement(page, '.place-search__counter');
    const votingElement = getElement(page, '.place-search__voting');
    const screenElement = getElement(page, '.place-search__screen');

    const matchId = Number(params.matchId);
    if (!Number.isInteger(matchId) || matchId < 0) {
        router.go('/matches', { replace: true });
        return;
    }

    const state: PlaceSearchState = {
        userId: null,
        matchId,
        city: null,
        search: null,
        decisions: [],
    };

    let isSubmitting = false;

    function renderState() {
        const search = state.search;
        if (!search) return;

        const isVoting = search.status === 'voting';
        votingElement.hidden = !isVoting;
        screenElement.innerHTML = '';
        if (!isVoting) {
            counterElement.innerHTML = '';
        }

        switch (search.status) {
            case 'voting': {
                if (!state.userId) return;

                const draft = loadDraft(state.userId, search.searchId) ?? [];
                state.decisions = validDecisions(draft, search.events);
                fillStack(stackElement, state);
                updateLayers(stackElement);
                updateProgress();

                if (state.decisions.length === search.events.length) {
                    submitResults();
                }
                break;
            }
            case 'waiting_partner':
                screenElement.innerHTML = emptyStateTemplate(WAITING_STATE);
                break;
            case 'completed':
                if (search.matches.length === 0) {
                    screenElement.innerHTML = emptyStateTemplate(NO_MATCHES_STATE);
                    break;
                }

                screenElement.innerHTML = placeSearchMatchesHbs({
                    tickets: search.matches
                        .map((event) => ticketTemplate('place-search__match', toTicketView(event)))
                        .join(''),
                });
                break;
            case 'cancelled':
                router.go('/matches');
                // как нам сделать то новый подбор если пришел кенселд по ручке для создания или открытия подбора?
                break;
        }
    }

    async function load(): Promise<void> {
        try {
            const user = await getCurrentUser();
            if (!page.isConnected) {
                return;
            }

            if (!user.city) {
                showModal({
                    ...NO_CITY_MODAL,
                    onClose: () => {
                        router.go('/matches', { replace: true });
                    },
                });
                return;
            }
            state.city = user.city;

            state.userId = user.user_id;

            const events = await createPlaceSearch({ matchId, city: state.city });
            if (!page.isConnected) {
                return;
            }

            state.search = toPlaceSearchView(events);

            renderState();
        } catch (error) {
            console.error('Не удалось загрузить подбор мест:', error);
            if (!page.isConnected) {
                return;
            }

            const code = error instanceof ApiError ? error.code : null;

            switch (code) {
                case 'NO_EVENTS':
                    showModal({
                        ...NO_EVENTS_MODAL,
                        onClose: () => router.go('/matches', { replace: true }),
                    });
                    break;
                case 'SEARCH_ALREADY_ACTIVE':
                    showModal({
                        ...SEARCH_ALREADY_ACTIVE_MODAL,
                        text: error instanceof ApiError ? error.message : '',
                        onClose: () => router.go('/matches', { replace: true }),
                    });
                    break;
                default:
                    showModal({ ...ERROR_MODAL, onClose: load });
                    break;
            }
        }
    }

    load();

    const stack = initStack(stackElement, {
        onSwipe(card: HTMLElement, direction) {
            const search = state.search;
            if (!state.userId || !search || direction === 'super') return;

            const swiped = search.events.find((place) => place.id === Number(card.dataset.id));
            if (!swiped) return;

            state.decisions.push({ id: swiped.id, direction });
            saveDraft(state.userId, search.searchId, state.decisions);

            fillStack(stackElement, state);
            updateLayers(stackElement);
            updateProgress();

            if (state.decisions.length === search.events.length) {
                submitResults();
            }
        },
        directions: ['like', 'dislike'],
    });

    async function submitResults(): Promise<void> {
        const search = state.search;
        const userId = state.userId;
        if (!userId || !search || isSubmitting) return;

        const liked: number[] = [];
        state.decisions.forEach((el) => {
            if (el.direction === 'like') liked.push(el.id);
        });

        isSubmitting = true;
        updateProgress();

        try {
            const result = await sendPlaceSearchResults({
                matchId,
                searchId: search.searchId,
                likedEventIds: liked,
            });

            clearDraft(userId, search.searchId);
            if (!page.isConnected) return;

            state.search = toPlaceSearchView(result);
            renderState();
        } catch (error) {
            console.error('Не удалось отправить результаты подбора:', error);
            if (!page.isConnected) return;

            const status = error instanceof ApiError ? error.status : null;

            switch (status) {
                case 404:
                    clearDraft(userId, search.searchId);
                    showModal({
                        ...EXPIRED_MODAL,
                        onClose: () => router.go('/matches', { replace: true }),
                    });
                    break;
                case null:
                    load();
                    break;
                default:
                    showModal({ ...ERROR_MODAL, onClose: submitResults });
            }
        } finally {
            isSubmitting = false;
            updateProgress();
        }
    }

    const actionsElement = getElement(page, '.place-search__actions');
    const undoButton = getElement<HTMLButtonElement>(actionsElement, '[data-action="undo"]');
    actionsElement.addEventListener('click', (event) => {
        if (!(event.target instanceof Element)) return;

        const button = event.target.closest<HTMLButtonElement>('[data-action]');
        if (!button || button.disabled) return;

        const action = button.dataset.action;

        if (
            (action === 'like' || action === 'dislike') &&
            stackElement.lastElementChild instanceof HTMLElement
        ) {
            stack.swipe(stackElement.lastElementChild, action);
        } else if (action === 'undo') {
            undo();
        }
    });

    updateProgress();

    function updateProgress() {
        undoButton.disabled = state.decisions.length === 0 || isSubmitting;

        const total = state.search?.events.length ?? 0;
        if (total === 0 || state.search?.status !== 'voting') {
            counterElement.innerHTML = '';
            return;
        }

        const current = Math.min(state.decisions.length + 1, total);
        counterElement.innerHTML = pillTemplate({
            icon: null,
            text: `${current} из ${total}`,
            size: 's',
            color: 'lilac',
        });
    }

    function undo() {
        const search = state.search;
        if (!state.userId || !search || state.decisions.length === 0 || stack.isStackAnimating())
            return;

        const last = state.decisions.pop();
        if (!last) return;

        if (state.decisions.length === 0) {
            clearDraft(state.userId, search.searchId);
        } else {
            saveDraft(state.userId, search.searchId, state.decisions);
        }
        updateProgress();

        const event = search.events[state.decisions.length];
        if (!event) return;

        stackElement.insertAdjacentHTML(
            'beforeend',
            ticketTemplate('swipe-stack__card', toTicketView(event)),
        );
        if (stackElement.children.length > 3) {
            stackElement.firstElementChild?.remove();
        }

        const card = stackElement.lastElementChild;
        if (!(card instanceof HTMLElement)) return;

        stack.unswipe(card, last.direction);
        updateLayers(stackElement);
    }
}
