import { profileCardTemplate, nextPhoto } from '../profile-card/profile-card.js';
import { profileDetailsTemplate } from '../profile-details/profile-details.js';
import { initStack } from './__stack/feed__stack.js';
import { feedFilterTemplate, initFeedFilter } from './__filter/feed__filter.js';
import { roundButtonTemplate, type RoundButtonData } from '../round-button/round-button.js';
import { emptyStateLayout } from '../empty-state/empty-state.js';
import { getFeed, sendSwipe } from '../../api/api.js';
import { showModal } from '../modal/modal.js';
import { interestIconUrl, interestLabel } from '../../interests.js';
import feedHbs from './feed.hbs';
import { type Cursor, type FeedItem, type Photo, type SwipeAction } from '../../api/api.types.js';
import { getElement } from '../../dom.js';
import { processFacts, type FactData } from '../../facts/facts.js';
import { MATCH_COLORS, PHOTO_PLACEHOLDER } from '../../icons.js';

const PILL_COLORS = ['pink', 'sky', 'lilac', 'mint', 'sun'];

export interface PillData {
    text: string;
    icon: string | null;
    color: string;
    size?: string;
}

export interface ProfileData {
    id: number;
    name: string;
    age: number;
    about: string | null;
    imgPath: string[];
    location: string | null;
    hasCompatibility: boolean;
    compatibility: number | null;
    compatibilityVerdict: string | null;
    interests: PillData[];
    facts: FactData[];
}

export interface FeedState {
    profiles: ProfileData[];
    index: number;
    nextCursor: Cursor | null;
    hasMore: boolean;
    isLoading: boolean;
}

interface LastSwipe {
    profile: ProfileData;
    direction: SwipeAction;
    isPending: boolean;
}

/**
 * @param {number} percent - Совместимость в процентах.
 * @returns {string} Словесная оценка совместимости.
 */
function compatibilityVerdict(percent: number): string {
    if (percent > 85) return 'очень высокая';
    if (percent > 70) return 'хорошая';
    if (percent > 50) return 'средняя';
    return 'низкая';
}

/**
 * @param {string} tag - Ключ тега с бэкенда.
 * @param {number} index
 * @returns {{text: string, icon: string|null, color: string}} Данные для пилюли интереса.
 */
function toInterest(tag: string, index: number): PillData {
    return {
        text: interestLabel(tag),
        icon: interestIconUrl(tag),
        color: PILL_COLORS[index % PILL_COLORS.length],
    };
}

/**
 * Переводит анкету из ответа API в данные для шаблонов карточки и деталей.
 *
 * @param {Object} item - Анкета из ленты.
 * @returns {Object}
 */
function toProfileView(item: FeedItem): ProfileData {
    const compatibility = item.compatibility !== null ? Math.round(item.compatibility * 100) : null;
    const hasCompatibility = compatibility !== null;

    return {
        id: item.user_id,
        name: item.name,
        age: item.age,
        about: item.about_me,
        imgPath:
            item.photos.length > 0
                ? item.photos.map((photo: Photo) => photo.url)
                : [PHOTO_PLACEHOLDER],
        location: item.city,
        hasCompatibility,
        compatibility,
        compatibilityVerdict: hasCompatibility ? compatibilityVerdict(compatibility) : null,
        interests: item.tags.map(toInterest),
        facts: processFacts(item),
    };
}

const ACTIONS: RoundButtonData[] = [
    { type: 'undo', size: 's', icon: '/icons/undo.svg', label: 'Вернуть' },
    { type: 'dislike', size: 'l', icon: '/icons/x.svg', label: 'Не нравится' },
    { type: 'super', size: 'm', icon: '/icons/star.svg', label: 'Суперлайк' },
    { type: 'like', size: 'l', icon: '/icons/heart_filled.svg', label: 'Нравится' },
];

const PREFETCH_THRESHOLD = 4;

const SWIPE_ERROR_MODAL = {
    image: '/icons/mascot-error.svg',
    title: 'Произошла ошибка',
    text: 'Свайп не отправился, похоже, что пропала связь. Анкета осталась на месте, попробуйте свайпнуть снова.',
};

const LOAD_ERROR_MODAL = {
    image: '/icons/mascot-error.svg',
    title: 'Произошла ошибка',
    text: 'Не удалось загрузить анкеты, похоже, что пропала связь. Попробуйте ещё раз.',
    buttonText: 'Повторить',
};

/**
 * Добавляет карточки под низ стопки, пока в ней не станет три.
 *
 * @param {HTMLElement} stackElement
 * @param {Object} state - Состояние ленты.
 */
function fillStack(stackElement: HTMLElement, state: FeedState) {
    while (stackElement.children.length < 3) {
        const nextIndex = state.index + stackElement.children.length;
        if (!state.profiles[nextIndex]) break;

        const html = cardHtml(nextIndex, state);
        stackElement.insertAdjacentHTML('afterbegin', html);
    }
}

/**
 * Расставляет модификаторы слоёв: у верхней карточки layer_1.
 *
 * @param {HTMLElement} stackElement
 */
function updateLayers(stackElement: HTMLElement) {
    const cards = [...stackElement.children].reverse();

    cards.forEach((card, index) => {
        card.classList.remove('feed__card_layer_1', 'feed__card_layer_2', 'feed__card_layer_3');
        card.classList.add(`feed__card_layer_${index + 1}`);
    });
}

/**
 * @param {number} index - Индекс анкеты в state.profiles.
 * @param {Object} state - Состояние ленты.
 * @returns {string} HTML карточки или пустая строка, если анкеты нет.
 */
function cardHtml(index: number, state: FeedState): string {
    const profile = state.profiles[index];
    if (!profile) return '';

    return profileCardTemplate('feed__card', {
        ...profile,
        matchColor: MATCH_COLORS[index % MATCH_COLORS.length],
    });
}

/**
 * @param {Object} state - Состояние ленты.
 * @returns {string} HTML деталей текущей анкеты.
 */
function detailsHtml(state: FeedState): string {
    const profile = state.profiles[state.index];
    if (!profile) return '';

    return profileDetailsTemplate(profile);
}

/**
 * Рендерит ленту анкет. Если свайп не отправился, анкета возвращается наверх стопки.
 *
 * @param {HTMLElement} root
 */
export function renderFeedPage(root: HTMLElement) {
    const state: FeedState = {
        profiles: [],
        index: 0,
        nextCursor: null,
        hasMore: true,
        isLoading: false,
    };

    let lastSwipe: LastSwipe | null = null;

    const page: HTMLElement = document.createElement('section');
    page.className = 'feed';

    const details = detailsHtml(state);

    page.innerHTML = feedHbs({
        details: details,
        actions: ACTIONS.map((action) => roundButtonTemplate(action)).join(''),
        emptyState: emptyStateLayout(),
        filter: feedFilterTemplate({ label: 'Фильтр' }),
    });

    root.append(page);

    const feedFilter = initFeedFilter(page, { onApply: reloadBehindTop });

    const stackElement = getElement(page, '.feed__stack');
    const detailsElement = getElement(page, '.feed__details');

    const stack = initStack(stackElement, {
        onSwipe(card: HTMLElement, direction: SwipeAction) {
            const swiped = state.profiles.find((profile) => profile.id === Number(card.dataset.id));
            // const swiped = state.profiles[state.index];
            if (!swiped) return;
            // lastSwipe = direction;
            const current: LastSwipe = {
                direction: direction,
                profile: swiped,
                isPending: true,
            };

            lastSwipe = current;
            updateUndo();

            sendSwipe(swiped.id, direction)
                .then(() => {
                    current.isPending = false;
                    updateUndo();
                })
                .catch((error) => {
                    console.error('Не удалось отправить свайп:', error);
                    if (!page.isConnected) return;

                    state.profiles.splice(state.index, 0, swiped);
                    const html = cardHtml(state.index, state);
                    stackElement.insertAdjacentHTML('beforeend', html);
                    if (stackElement.children.length > 3) {
                        stackElement.firstElementChild?.remove();
                    }
                    updateLayers(stackElement);
                    updateEmpty();
                    detailsElement.innerHTML = detailsHtml(state);

                    if (lastSwipe === current) lastSwipe = null;

                    updateUndo();
                    showModal(SWIPE_ERROR_MODAL);
                });

            state.index++;
            if (state.profiles.length - state.index <= PREFETCH_THRESHOLD) {
                loadMore();
            }

            fillStack(stackElement, state);
            updateLayers(stackElement);
            updateUndo();
            updateEmpty();
            detailsElement.innerHTML = detailsHtml(state);
        },
        onTap: nextPhoto,
    });

    const actionsElement = getElement(page, '.feed__actions');
    const undoButton = getElement<HTMLButtonElement>(actionsElement, '[data-action="undo"]');
    actionsElement.addEventListener('click', (event) => {
        if (!(event.target instanceof Element)) return;

        const button = event.target.closest<HTMLButtonElement>('[data-action]');
        if (!button || button.disabled) return;

        const action = button.dataset.action;

        if (
            (action === 'like' || action === 'dislike' || action === 'super') &&
            stackElement.lastElementChild instanceof HTMLElement
        ) {
            stack.swipe(stackElement.lastElementChild, action);
        } else if (action === 'undo') {
            undo();
        }
    });

    const feedEmptyElement = getElement(page, '.feed__empty');
    const feedEmptyUndoButton = getElement<HTMLButtonElement>(
        feedEmptyElement,
        '[data-action="undo"]',
    );
    feedEmptyUndoButton.addEventListener('click', undo);

    const feedEmptyFilterButton = getElement<HTMLButtonElement>(
        feedEmptyElement,
        '[data-action="filter"]',
    );
    feedEmptyFilterButton.addEventListener('click', (event) => {
        // Иначе этот же клик дойдёт до document и панель сразу закроется как клик снаружи.
        event.stopPropagation();
        feedFilter.open();
    });

    updateUndo();
    loadMore();

    /**
     * Догружает следующую страницу ленты, если она есть и загрузка ещё не идёт.
     */
    function loadMore() {
        if (state.isLoading || !state.hasMore) return;
        state.isLoading = true;

        // reloadBehindTop заменяет массив: ответ для старого массива пришёл по старому фильтру.
        const profiles = state.profiles;

        getFeed({ cursor: state.nextCursor ?? undefined })
            .then(({ items, next_cursor: nextCursor }) => {
                if (!page.isConnected || profiles !== state.profiles) return;

                const wasExhausted = state.index >= state.profiles.length;
                // Верхняя карточка, оставшаяся после смены фильтра, может прийти снова.
                const knownIds = new Set(state.profiles.map((profile) => profile.id));
                const newItems = items.filter((item) => !knownIds.has(item.user_id));

                state.profiles.push(...newItems.map(toProfileView));
                state.nextCursor = nextCursor;
                state.hasMore = nextCursor !== null;

                fillStack(stackElement, state);
                updateLayers(stackElement);
                if (wasExhausted) {
                    const detailsElement = getElement(page, '.feed__details');
                    detailsElement.innerHTML = detailsHtml(state);
                }
                updateEmpty();
            })
            .catch((error) => {
                console.error('Не удалось загрузить ленту:', error);
                if (!page.isConnected || profiles !== state.profiles) return;

                if (state.index >= state.profiles.length) {
                    showModal({ ...LOAD_ERROR_MODAL, onClose: loadMore });
                }
            })
            .finally(() => {
                if (profiles === state.profiles) state.isLoading = false;
            });
    }

    function reloadBehindTop() {
        const top = state.profiles[state.index];

        state.profiles = top ? [top] : [];
        state.index = 0;
        state.nextCursor = null;
        state.hasMore = true;
        state.isLoading = false;

        [...stackElement.children].slice(0, -1).forEach((card) => card.remove());

        lastSwipe = null;
        updateUndo();
        updateEmpty();
        loadMore();
    }

    /**
     * Показывает заглушку, когда анкеты закончились и больше их нет.
     */
    function updateEmpty() {
        const isExhausted = state.index >= state.profiles.length;
        page.classList.toggle('feed_empty', isExhausted && !state.hasMore);
    }

    function updateUndo() {
        const isDisabled = lastSwipe === null || lastSwipe?.isPending;
        undoButton.disabled = isDisabled;
        feedEmptyUndoButton.disabled = isDisabled;
    }

    function undo() {
        if (!lastSwipe || stack.isStackAnimating() || lastSwipe.isPending) return;

        const { direction } = lastSwipe;
        lastSwipe = null;
        updateUndo();

        state.index--;
        const html = cardHtml(state.index, state);
        stackElement.insertAdjacentHTML('beforeend', html);
        if (stackElement.children.length > 3) {
            stackElement.firstElementChild?.remove();
        }
        const card = stackElement.lastElementChild;

        if (!(card instanceof HTMLElement)) return;

        updateEmpty();
        stack.unswipe(card, direction);
        updateLayers(stackElement);
        detailsElement.innerHTML = detailsHtml(state);
    }
}
