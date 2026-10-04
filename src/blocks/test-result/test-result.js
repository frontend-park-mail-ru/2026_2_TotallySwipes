import { traitScaleTemplate } from '../trait-scale/trait-scale.js';
import { showModal } from '../modal/modal.js';
import { getCurrentUser } from '../../api/api.js';
import { loadResult, clearResult, startDraft } from '../../storage/test-storage.js';

const ERROR_MODAL = {
    image: '/public/icons/mascot-error.svg',
    title: 'Произошла ошибка',
    text: 'Похоже, что пропала связь. Попробуйте ещё раз.',
    buttonText: 'Повторить',
};

const TRAITS = [
    {
        share: (bigFive) => bigFive.extraversion,
        title: 'Экстраверсия',
        low: 'сдержанность',
        high: 'общительность',
        color: 'sun',
    },
    {
        share: (bigFive) => bigFive.agreeableness,
        title: 'Доброжелательность',
        low: 'прямота',
        high: 'теплота',
        color: 'pink',
    },
    {
        share: (bigFive) => bigFive.conscientiousness,
        title: 'Добросовестность',
        low: 'спонтанность',
        high: 'организованность',
        color: 'sky',
    },
    {
        share: (bigFive) => 1 - bigFive.neuroticism,
        title: 'Эмоциональная стабильность',
        low: 'чувствительность',
        high: 'спокойствие',
        color: 'mint',
    },
    {
        share: (bigFive) => bigFive.openness,
        title: 'Открытость опыту',
        low: 'привычное',
        high: 'новое',
        color: 'lilac',
    },
];

const MIN_SCORE = 1;
const MAX_SCORE = 7;

function toScore(share) {
    const score = MIN_SCORE + share * (MAX_SCORE - MIN_SCORE);
    return Math.round(score * 10) / 10;
}

function capitalize(text) {
    return text.charAt(0).toUpperCase() + text.slice(1);
}

function splitAbout(about) {
    const colon = about.indexOf(':');

    return {
        name: about.slice(0, colon).trim(),
        text: capitalize(about.slice(colon + 1).trim()),
    };
}

function traitsHtml(bigFive) {
    return TRAITS.map(({ share, ...trait }) =>
        traitScaleTemplate({ ...trait, score: toScore(share(bigFive)) }),
    ).join('');
}

function toResultView(result) {
    const { name, text } = splitAbout(result.about_personality_type);

    return {
        title: name.toLowerCase(),
        description: text,
        traits: traitsHtml(result.big_five),
    };
}

function confirmRestart(router, userId) {
    showModal({
        image: '/public/icons/clock-mascot.svg',
        title: 'Пройти тест заново?',
        text: 'Текущий результат и ответы сотрутся, а процент совместимости в анкетах пересчитается после нового прохождения. Это около двух минут.',
        buttonText: 'Пройти заново',
        cancelText: 'Оставить результат',
        onClose: (returnValue) => {
            if (returnValue === 'confirm') {
                clearResult(userId);
                startDraft(userId);
                router.go('/test');
            }
        },
    });
}

export function renderTestResultPage(root, router) {
    let userId = null;

    const page = document.createElement('section');
    page.className = 'test-result';
    root.append(page);

    async function load() {
        try {
            const user = await getCurrentUser();

            if (!page.isConnected) {
                return;
            }

            userId = user.user_id;
            const result = loadResult(userId);

            page.innerHTML = Handlebars.templates['test-result/test-result'](
                result ? toResultView(result) : { empty: true },
            );
        } catch (error) {
            console.error('Не удалось загрузить пользователя:', error);

            if (page.isConnected) {
                showModal({ ...ERROR_MODAL, onClose: load });
            }
        }
    }

    page.addEventListener('click', (event) => {
        if (event.target.closest('.test-result__button_restart, .test-result__back')) {
            confirmRestart(router, userId);
        }
    });

    load();
}
