import { getMatches, sendMatchSeen } from '../../api/api';
import type { Cursor, Match } from '../../api/api.types';
import { getElement } from '../../utils/dom.js';
import { MATCH_COLORS, PHOTO_PLACEHOLDER } from '../../icons';
import { matchCardTemplate, type MatchCardData } from '../match-card/match-card';
import { showModal } from '../modal/modal';
import matchesHbs from './matches.hbs';

//TODO: вынести в общий константы отсюда и из feed.ts
const LOAD_ERROR_MODAL = {
    image: '/icons/mascot-error.svg',
    title: 'Произошла ошибка',
    text: 'Не удалось загрузить анкеты, похоже, что пропала связь. Попробуйте ещё раз.',
    buttonText: 'Повторить',
};

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
        userId: item.user_id,
        name: item.name,
        age: item.age,
        imgPath: item.photo_url ? item.photo_url : PHOTO_PLACEHOLDER,
        compatibility,
        hasCompatibility,
        matchColor: MATCH_COLORS[offset % MATCH_COLORS.length],
        isNew: item.is_new,
        offset,
    };
}

function mutualWord(count: number): string {
    const lastTwo = count % 100;
    const last = lastTwo % 10;

    if (lastTwo >= 11 && lastTwo <= 14) return 'взаимных';
    if (last === 1) return 'взаимная';
    if (last >= 2 && last <= 4) return 'взаимные';
    return 'взаимных';
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
                moreButton.classList.toggle('matches__more_hidden', nextCursor === null);
                countElement.textContent = `${total} ${mutualWord(total)}`;
                page.classList.toggle('matches_empty', state.offset === 0);
            })
            .catch((error) => {
                console.error('Не удалось загрузить симпатии:', error);
                if (!page.isConnected) return;

                showModal({ ...LOAD_ERROR_MODAL, onClose: loadMore });
            })
            .finally(() => {
                state.isLoading = false;
                moreButton.disabled = false;
            });
    }
}
