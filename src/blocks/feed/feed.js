import { profileCardTemplate } from "../profile-card/profile-card.js";
import { profileDetailsTemplate } from "../profile-details/profile-details.js";
import { initStack } from "./__stack/feed__stack.js";
import { roundButtonTemplate } from "../round-button/round-button.js";
import { emptyStateLayout } from "../empty-state/empty-state.js";
import { getFeed, sendSwipe } from "../../api/api.js";

const TAGS = {
    coffee: { text: 'Кофе', icon: 'coffee' },
    books: { text: 'Книги', icon: 'book' },
    music: { text: 'Музыка', icon: 'music' },
    hiking: { text: 'Походы', icon: 'mountain' },
    bicycle: { text: 'Велосипед', icon: 'bike' },
    travel: { text: 'Путешествия', icon: 'plane' },
    photo: { text: 'Фото', icon: 'camera' },
    board_games: { text: 'Настолки', icon: 'game' },
    cooking: { text: 'Кулинария', icon: 'flame' },
    running: { text: 'Бег', icon: 'zap' },
    painting: { text: 'Рисование', icon: 'palette' },
    movies: { text: 'Кино', icon: 'eye' },
    concerts: { text: 'Концерты', icon: 'users' },
    animals: { text: 'Животные', icon: 'heart' },
    sport: { text: 'Спорт', icon: 'zap' },
};

const STATIC_LOCATION = 'Москва, Хамовники · 3 км';

const STATIC_FACTS = [
    { label: 'Рост', value: '168 см' },
    { label: 'Работа', value: 'Редактор' },
    { label: 'Образование', value: 'Высшее' },
    { label: 'Курение', value: 'Не курю' },
];

const PHOTO_PLACEHOLDER = '/public/icons/card-mascot-sky.svg';

const PILL_COLORS = ['pink', 'sky', 'lilac', 'mint', 'sun'];

function compatibilityVerdict(percent) {
    if (percent > 85) return 'очень высокая';
    if (percent > 70) return 'хорошая';
    if (percent > 50) return 'средняя';
    return 'низкая';
}

function toInterest(tag, index) {
    const known = TAGS[tag];

    return {
        text: known ? known.text : tag,
        icon: known ? `/public/icons/${known.icon}.svg` : null,
        color: PILL_COLORS[index % PILL_COLORS.length],
    };
}

function toProfileView(item) {
    const hasCompatibility = item.compatibility !== null;
    const compatibility = hasCompatibility ? Math.round(item.compatibility * 100) : null;

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
        facts: [{ label: 'Цель', value: item.dating_intent }, ...STATIC_FACTS].filter((fact) => fact.value),
    };
}

const ACTIONS = [
    { type: 'undo', size: 's', icon: '/public/icons/undo.svg', label: 'Вернуть', disabled: true },
    { type: 'dislike', size: 'l', icon: '/public/icons/x.svg', label: 'Не нравится' },
    { type: 'super', size: 'm', icon: '/public/icons/star.svg', label: 'Суперлайк' },
    { type: 'like', size: 'l', icon: '/public/icons/heart_filled.svg', label: 'Нравится' },
];

const MATCH_COLORS = ['lilac', 'mint', 'pink', 'sky', 'sun'];

const state = {
    profiles: [],
    index: 0,
}

function cardHtml(index, layer) {
    const profile = state.profiles[index];
    if (!profile) return '';

    return profileCardTemplate(`feed__card feed__card_layer_${layer}`, {
        ...profile,
        matchColor: MATCH_COLORS[index % MATCH_COLORS.length],
    });
}

function stackCardsHtml(state) {
    return [3, 2, 1].map((layer) => cardHtml(state.index + layer - 1, layer)).join('');
}

function detailsHtml() {
    const profile = state.profiles[state.index];
    if (!profile) return '';

    return profileDetailsTemplate(profile);
}

export function renderFeedPage(root) {
    const page = document.createElement('section');
    page.className = 'feed';

    state.profiles = [];
    state.index = 0;

    const cards = stackCardsHtml(state);
    const details = detailsHtml()

    
    page.innerHTML = Handlebars.templates['feed/feed']({
        cards: cards,
        details: details,
        actions: ACTIONS.map((action) => roundButtonTemplate(action)).join(''),
        emptyState: emptyStateLayout(),
    });

    root.append(page);

    const stack = initStack(page.querySelector('.feed__stack'), {
        onSwipe(direction) {
            const swiped = state.profiles[state.index];
            sendSwipe(swiped.id, direction).catch((error) => {
                console.error('Не удалось отправить свайп:', error);
            });

            state.index++;
            updateEmpty();
            page.querySelector('.feed__details').innerHTML = detailsHtml();

            return cardHtml(state.index + 2, 3);
        },
    });

    page.querySelector('.feed__actions').addEventListener('click', (event) => {
        const button = event.target.closest('[data-action]');
        if (!button || button.disabled) return;

        stack.swipe(button.dataset.action);
    });

    getFeed()
        .then(({ items }) => {
            state.profiles = items.map(toProfileView);
            state.index = 0;
            page.querySelector('.feed__stack').innerHTML = stackCardsHtml(state);
            page.querySelector('.feed__details').innerHTML = detailsHtml();
            updateEmpty();
        })
        .catch((error) => {
            console.error('Не удалось загрузить ленту:', error);
        });

    function updateEmpty() {
        page.classList.toggle('feed_empty', state.index >= state.profiles.length);
    }


}
