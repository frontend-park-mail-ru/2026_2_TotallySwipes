import { traitScaleTemplate } from '../trait-scale/trait-scale.js';
import { getTestResult } from '../../api/api.js';
import { showModal } from '../modal/modal.js';

const TRAITS = [
    {
        key: 'extraversion',
        title: 'Экстраверсия',
        low: 'сдержанность',
        high: 'общительность',
        color: 'sun',
    },
    {
        key: 'agreeableness',
        title: 'Доброжелательность',
        low: 'прямота',
        high: 'теплота',
        color: 'pink',
    },
    {
        key: 'conscientiousness',
        title: 'Добросовестность',
        low: 'спонтанность',
        high: 'организованность',
        color: 'sky',
    },
    {
        key: 'emotional_stability',
        title: 'Эмоциональная стабильность',
        low: 'чувствительность',
        high: 'спокойствие',
        color: 'mint',
    },
    {
        key: 'openness',
        title: 'Открытость опыту',
        low: 'привычное',
        high: 'новое',
        color: 'lilac',
    },
];

const LOAD_ERROR_MODAL = {
    image: '/public/icons/mascot-error.svg',
    title: 'Произошла ошибка',
    text: 'Не удалось загрузить результат теста, похоже, что пропала связь. Попробуйте ещё раз.',
    buttonText: 'Повторить',
};

function traitsHtml(scores) {
    return TRAITS.filter(({ key }) => typeof scores[key] === 'number')
        .map(({ key, ...trait }) => traitScaleTemplate({ ...trait, score: scores[key] }))
        .join('');
}

export function renderTestResultPage(root) {
    const page = document.createElement('section');
    page.className = 'test-result';

    root.append(page);

    load();

    function load() {
        getTestResult()
            .then((result) => {
                if (!page.isConnected) return;

                page.innerHTML = Handlebars.templates['test-result/test-result']({
                    title: result.type.title,
                    description: result.type.description,
                    traits: traitsHtml(result.scores),
                });
            })
            .catch((error) => {
                console.error('Не удалось загрузить результат теста:', error);
                if (!page.isConnected) return;

                showModal({ ...LOAD_ERROR_MODAL, onClose: load });
            });
    }
}
