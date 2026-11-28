import { getMatches, sendMatchSeen } from '../../api/api';
import type { Cursor, Match } from '../../api/api.types';
import { getElement } from '../../utils/dom.js';
import { pluralize } from '../../utils/format.js';
import { MATCH_COLORS, PHOTO_PLACEHOLDER } from '../../icons';
import { matchCardTemplate, type MatchCardData } from '../match-card/match-card';
import { showModal } from '../modal/modal';
import { isNetworkError, showOfflineToast } from '../../network';
import { isPlaceSearchEnabled } from '../../feature-flags.js';
import { subscribeToRuntimeConfig } from '../../runtime-config.js';
import matchesHbs from './matches.hbs';

//TODO: вынести в общий константы отсюда и из feed.ts
const LOAD_ERROR_MODAL = {
    image: '/icons/mascot-error.svg',
    title: 'Произошла ошибка',
    text: 'Не удалось загрузить анкеты, похоже, что пропала связь. Попробуйте ещё раз.',
    buttonText: 'Повторить',
};

// При выключенном флаге новый подбор не создать, но подбор, который начал партнёр,
// по той же ссылке откроется: бэк вернёт его, не проверяя флаг.
const MEETUP_TEXT = 'Назначить встречу';
const OPEN_SEARCH_TEXT = 'Открыть подбор';

/**
 * @returns Текст кнопки подбора мест по текущему флагу.
 */
function meetupText(): string {
    return isPlaceSearchEnabled() ? MEETUP_TEXT : OPEN_SEARCH_TEXT;
}

const MORE_TEXT = 'Загрузить ещё';
const RETRY_TEXT = 'Повторить загрузку';

interface MathesState {
    isLoading: boolean;
    profiles: MatchCardData[];
    nextCursor: Cursor | null;
    offset: number;
}

function toMatchView(item: Match, offset: number): MatchCardData {
    const compatibility = item.compatibility !== null ? Math.round(item.compatibility * 100) : null;
    const hasCompatibility = compatibility !== null;
    return {
        matchId: item.match_id,
        chatHref: item.chat_id ? `/messages/${encodeURIComponent(item.chat_id)}` : undefined,
        userId: item.user_id,
        name: item.name,
        age: item.age,
        imgPath: item.photo_url ? item.photo_url : PHOTO_PLACEHOLDER,
        compatibility,
        hasCompatibility,
        matchColor: MATCH_COLORS[offset % MATCH_COLORS.length],
        isNew: item.is_new,
        canMeetup: item.can_meetup === true,
        meetupText: meetupText(),
        partnerFinished: item.partner_finished === true,
        offset,
    };
}

export function renderMatchesPage(root: HTMLElement) {
    const state: MathesState = {
        isLoading: false,
        profiles: [],
        nextCursor: null,
        offset: 0,
    };
    const page: HTMLElement = document.createElement('section');
    page.className = 'matches';

    page.innerHTML = matchesHbs();

    root.append(page);

    const gridElement = getElement(page, '.matches__grid');
    const moreButton = getElement<HTMLButtonElement>(page, '.matches__more');
    const moreText = getElement(moreButton, '.button__text');
    const countElement = getElement(page, '.matches__count');

    gridElement.addEventListener('click', (event) => {
        if (!(event.target instanceof Element) || !event.target.closest('a, button')) return;

        const card = event.target.closest<HTMLElement>('.match-card[data-new]');
        if (!card) return;

        delete card.dataset.new;
        sendMatchSeen(Number(card.dataset.matchId))
            .then(() => {
                getElement(card, '.match-card__new').remove();
            })
            .catch((error) => {
                card.dataset.new = '';
                console.error('Не удалось отметить мэтч просмотренным:', error);
            });
    });

    moreButton.addEventListener('click', loadMore);

    // Флаг переключили, пока страница открыта: меняем только текст кнопок, карточки остаются.
    const unsubscribe = subscribeToRuntimeConfig(() => {
        if (!page.isConnected) {
            unsubscribe();
            return;
        }

        const text = meetupText();
        page.querySelectorAll('.match-card__meetup-text').forEach((label) => {
            label.textContent = text;
        });
    });

    loadMore();
    function loadMore() {
        if (state.isLoading) return;

        state.isLoading = true;
        moreButton.disabled = true;
        getMatches({ cursor: state.nextCursor ?? undefined })
            .then(({ total, items, next_cursor: nextCursor }) => {
                const html = items
                    .map((match, i) =>
                        matchCardTemplate('matches__item', toMatchView(match, state.offset + i)),
                    )
                    .join('');

                gridElement.insertAdjacentHTML('beforeend', html);
                state.offset += items.length;
                state.nextCursor = nextCursor;
                moreText.textContent = MORE_TEXT;
                moreButton.classList.toggle('matches__more_hidden', nextCursor === null);
                const word = pluralize(total, 'взаимная', 'взаимные', 'взаимных');
                countElement.textContent = `${total} ${word}`;
                page.classList.toggle('matches_empty', state.offset === 0);
            })
            .catch((error) => {
                console.error('Не удалось загрузить симпатии:', error);
                if (!page.isConnected) return;

                if (isNetworkError(error)) {
                    showOfflineToast();
                    moreText.textContent = RETRY_TEXT;
                    moreButton.classList.remove('matches__more_hidden');
                } else {
                    showModal({ ...LOAD_ERROR_MODAL, onClose: loadMore });
                }
            })
            .finally(() => {
                state.isLoading = false;
                moreButton.disabled = false;
            });
    }
}
