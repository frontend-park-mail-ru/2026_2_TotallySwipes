import { profileCardTemplate } from '../profile-card/profile-card.js';
import { profileDetailsTemplate } from '../profile-details/profile-details.js';
import { initStack } from './__stack/feed__stack.js';
import { roundButtonTemplate, type RoundButtonData } from '../round-button/round-button.js';
import { ACCENT_COLORS, type AccentColor } from '../../colors.js';
import { emptyStateLayout } from '../empty-state/empty-state.js';
import { getFeed, sendSwipe } from '../../api/api.js';
import { showModal } from '../modal/modal.js';
import { interestIconUrl, interestLabel } from '../../interests.js';
import feedHbs from './feed.hbs';
import { type FeedCursor, type FeedItem, type SwipeAction } from '../../api/api.types.js';
import { getElement } from '../../utils/dom.js';
import { datingGoalFact } from '../../dating-goals.js';
const STATIC_LOCATION = 'Москва, Хамовники · 3 км';

// TODO: заполнять, когда будет профиль
// const STATIC_FACTS = [
//     { label: 'Рост', value: '168 см' },
//     { label: 'Работа', value: 'Редактор' },
//     { label: 'Образование', value: 'Высшее' },
//     { label: 'Курение', value: 'Не курю' },
// ];

const PHOTO_PLACEHOLDER = '/icons/photo-placeholder.svg';

/**
 * Данные блока "Пилюля".
 */
export interface PillData {
    /** Путь к иконке в формате SVG. Если иконка не нужна, передать `null`. */
    icon: string | null;
    /** Текст. */
    text: string;
    /** Размер. Если не указан, используется размер по умолчанию. */
    size?: 's';
    /** Цвет. */
    color: AccentColor;
}

export interface FactData {
    label: string;
    value: string | null;
}

export interface ProfileData {
    id: number;
    name: string;
    age: number;
    about: string | null;
    imgPath: string;
    location: string;
    hasCompatibility: boolean;
    compatibility: number | null;
    compatibilityVerdict: string | null;
    interests: PillData[];
    facts: FactData[];
}

export interface FeedState {
    profiles: ProfileData[];
    index: number;
    nextCursor: FeedCursor | null;
    hasMore: boolean;
    isLoading: boolean;
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
        color: ACCENT_COLORS[index % ACCENT_COLORS.length],
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
        imgPath: item.photos[0]?.url ?? PHOTO_PLACEHOLDER,
        location: STATIC_LOCATION,
        hasCompatibility,
        compatibility,
        compatibilityVerdict: hasCompatibility ? compatibilityVerdict(compatibility) : null,
        interests: item.tags.map(toInterest),
        facts: [{ label: 'Цель', value: datingGoalFact(item.dating_goal) }].filter(
            (fact) => fact.value,
        ),
        // TODO: расскоментировать когда убдет профиль
        // facts: [{ label: 'Цель', value: datingGoalFact(item.dating_goal) }, ...STATIC_FACTS].filter(
        //     (fact) => fact.value,
        // ),
    };
}

const ACTIONS: RoundButtonData[] = [
    { type: 'undo', size: 's', icon: '/icons/undo.svg', label: 'Вернуть', disabled: true },
    { type: 'dislike', size: 'l', icon: '/icons/x.svg', label: 'Не нравится' },
    { type: 'super', size: 'm', icon: '/icons/star.svg', label: 'Суперлайк' },
    { type: 'like', size: 'l', icon: '/icons/heart_filled.svg', label: 'Нравится' },
];

const MATCH_COLORS: readonly AccentColor[] = ['lilac', 'mint', 'pink', 'sky', 'sun'];

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

    const page: HTMLElement = document.createElement('section');
    page.className = 'feed';

    const details = detailsHtml(state);

    page.innerHTML = feedHbs({
        details: details,
        actions: ACTIONS.map((action) => roundButtonTemplate(action)).join(''),
        emptyState: emptyStateLayout(),
    });

    root.append(page);

    const stackElement = getElement(page, '.feed__stack');
    const detailsElement = getElement(page, '.feed__details');

    const stack = initStack(stackElement, {
        onSwipe(direction: SwipeAction) {
            const swiped = state.profiles[state.index];
            sendSwipe(swiped.id, direction).catch((error) => {
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
                showModal(SWIPE_ERROR_MODAL);
            });

            state.index++;
            if (state.profiles.length - state.index <= PREFETCH_THRESHOLD) {
                loadMore();
            }

            fillStack(stackElement, state);
            updateLayers(stackElement);
            updateEmpty();
            detailsElement.innerHTML = detailsHtml(state);
        },
    });

    const actionsElement = getElement(page, '.feed__actions');
    actionsElement.addEventListener('click', (event) => {
        if (!(event.target instanceof Element)) return;

        const button = event.target.closest<HTMLButtonElement>('[data-action]');
        if (!button || button.disabled) return;

        const direction = button.dataset.action;
        if (direction !== 'like' && direction !== 'dislike' && direction !== 'super') return;

        stack.swipe(direction);
    });

    loadMore();

    /**
     * Догружает следующую страницу ленты, если она есть и загрузка ещё не идёт.
     */
    function loadMore() {
        if (state.isLoading || !state.hasMore) return;
        state.isLoading = true;

        getFeed({ cursor: state.nextCursor ?? undefined })
            .then(({ items, next_cursor: nextCursor }) => {
                if (!page.isConnected) return;

                const wasExhausted = state.index >= state.profiles.length;

                state.profiles.push(...items.map(toProfileView));
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
                if (!page.isConnected) return;

                if (state.index >= state.profiles.length) {
                    showModal({ ...LOAD_ERROR_MODAL, onClose: loadMore });
                }
            })
            .finally(() => {
                state.isLoading = false;
            });
    }

    /**
     * Показывает заглушку, когда анкеты закончились и больше их нет.
     */
    function updateEmpty() {
        const isExhausted = state.index >= state.profiles.length;
        page.classList.toggle('feed_empty', isExhausted && !state.hasMore);
    }
}
