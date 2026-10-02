import { pillTemplate } from '../pill/pill.js';
import { stepsTemplate } from '../steps/steps.js';
import { scaleTemplate } from '../scale/scale.js';

const QUESTIONS = [
    { id: '101', text: 'открытого, полного энтузиазма' },
    { id: '102', text: 'критичного, склонного к спорам' },
    { id: '103', text: 'надёжного, дисциплинированного' },
    { id: '104', text: 'тревожного, легко расстраивающегося' },
    { id: '105', text: 'открытого новому, многогранного' },
    { id: '106', text: 'сдержанного, тихого' },
    { id: '107', text: 'отзывчивого, тёплого' },
    { id: '108', text: 'неорганизованного, беспечного' },
    { id: '109', text: 'спокойного, эмоционально устойчивого' },
    { id: '110', text: 'консервативного, нетворческого' },
];

const ANSWER_OPTIONS = [1, 2, 3, 4, 5, 6, 7];

const CAPTIONS = [
    { text: 'совсем не про меня', align: 'start' },
    { text: 'отчасти', align: 'center' },
    { text: 'точно про меня', align: 'end' },
];

const COLORS = ['sun', 'pink', 'sky', 'mint', 'lilac'];

const STICKER = '/public/icons/sun.svg';

function colorOf(index) {
    return COLORS[index % COLORS.length];
}

function stepNumber(index) {
    return String(index + 1).padStart(2, '0');
}

export function renderTestPage(root) {
    const current = 0;
    const total = QUESTIONS.length;
    const question = QUESTIONS[current];
    const color = colorOf(current);

    const state = {
        current: 0,
        answers: {},
    };
    state.index++;

    const page = document.createElement('section');
    page.className = 'test';

    page.innerHTML = Handlebars.templates['test/test']({
        statement: question.text,
        sticker: STICKER,
        total,
        remaining: total,
        counter: pillTemplate(
            {
                text: `Вопрос ${current + 1} из ${total}`,
                color,
                icon: '/public/icons/sparkles.svg',
                size: 's',
            },
            'test__counter',
        ),
        steps: stepsTemplate(
            QUESTIONS.map((_, index) => ({
                number: stepNumber(index),
                color: colorOf(index),
                state: index === current ? 'current' : '',
            })),
            'test__steps',
        ),
        scale: scaleTemplate(
            {
                name: 'answer',
                legend: `Я воспринимаю себя как ${question.text}`,
                color,
                options: ANSWER_OPTIONS,
                captions: CAPTIONS,
            },
            'test__scale',
        ),
    });

    root.append(page);
}
