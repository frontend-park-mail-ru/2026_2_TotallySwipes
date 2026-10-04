import { pillTemplate } from '../pill/pill.js';
import { stepsTemplate } from '../steps/steps.js';
import { scaleTemplate } from '../scale/scale.js';
import { showModal } from '../modal/modal.js';
import {
    ApiError,
    getCurrentUser,
    getCurrentTest,
    getMyTestResult,
    sendTestResults,
} from '../../api/api.js';
import { saveDraft, loadDraft, clearDraft, saveResult } from '../../storage/test-storage.js';

const COLORS = ['sun', 'pink', 'sky', 'mint', 'lilac'];

const STICKERS = {
    sun: '/public/icons/sun.svg',
    pink: '/public/icons/star-pink.svg',
    sky: '/public/icons/star-sky.svg',
    mint: '/public/icons/cloud.svg',
    lilac: '/public/icons/star-lilac.svg',
};

const ERROR_MODAL = {
    image: '/public/icons/mascot-error.svg',
    title: 'Произошла ошибка',
    text: 'Похоже, что пропала связь. Попробуйте ещё раз.',
    buttonText: 'Повторить',
};

function colorOf(index) {
    return COLORS[index % COLORS.length];
}

function stepNumber(index) {
    return String(index + 1).padStart(2, '0');
}

function toCaptions(options) {
    return [
        { text: options[0].label, align: 'start' },
        { text: options[Math.floor(options.length / 2)].label, align: 'center' },
        { text: options[options.length - 1].label, align: 'end' },
    ];
}

function toTest(data) {
    return {
        id: data.test_id,
        questions: data.questions,
        options: data.answer_options,
        values: data.answer_options.map((option) => option.value),
        captions: toCaptions(data.answer_options),
    };
}

function isAnswered(state, question) {
    return state.answers[question.id] !== undefined;
}

function stepState(index, question, state) {
    if (index === state.current) {
        return 'current';
    }

    if (isAnswered(state, question)) {
        return 'done';
    }

    return '';
}

async function fetchMyResult() {
    try {
        return await getMyTestResult();
    } catch (error) {
        if (error instanceof ApiError && error.status === 404) {
            return null;
        }

        throw error;
    }
}

function restoreState(draft, test) {
    const state = { current: 0, answers: {}, isSubmitting: false };

    if (!draft || draft.testId !== test.id) {
        return state;
    }

    for (const question of test.questions) {
        const value = draft.answers?.[question.id];

        if (test.values.includes(value)) {
            state.answers[question.id] = value;
        }
    }

    if (
        Number.isInteger(draft.current) &&
        draft.current >= 0 &&
        draft.current < test.questions.length
    ) {
        state.current = draft.current;
    }

    return state;
}

export function renderTestPage(root, router) {
    let userId = null;
    let test = null;
    let state = null;

    const page = document.createElement('section');
    page.className = 'test';
    root.append(page);

    function total() {
        return test.questions.length;
    }

    function answeredCount() {
        return test.questions.filter((question) => isAnswered(state, question)).length;
    }

    function persist() {
        saveDraft(userId, { testId: test.id, current: state.current, answers: state.answers });
    }

    function render() {
        const color = colorOf(state.current);
        const question = test.questions[state.current];
        const answer = state.answers[question.id];
        const remaining = total() - answeredCount();

        page.innerHTML = Handlebars.templates['test/test']({
            statement: question.body,
            sticker: STICKERS[color],
            total: total(),
            allAnswered: remaining === 0,
            canNext: answer !== undefined,
            isSubmitting: state.isSubmitting,
            counter: pillTemplate(
                {
                    text: `Вопрос ${state.current + 1} из ${total()}`,
                    color,
                    icon: '/public/icons/sparkles.svg',
                    size: 's',
                },
                'test__counter',
            ),
            steps: stepsTemplate(
                test.questions.map((item, index) => ({
                    number: stepNumber(index),
                    color: colorOf(index),
                    state: stepState(index, item, state),
                })),
                'test__steps',
            ),
            scale: scaleTemplate(
                {
                    name: 'answer',
                    legend: `Я воспринимаю себя как ${question.body}`,
                    color,
                    options: test.options.map((option) => ({
                        ...option,
                        checked: option.value === answer,
                    })),
                    captions: test.captions,
                    disabled: state.isSubmitting,
                },
                'test__scale',
            ),
        });
    }

    async function load() {
        try {
            const user = await getCurrentUser();
            userId = user.user_id;

            const draft = loadDraft(userId);
            const result = draft ? null : await fetchMyResult();

            if (!page.isConnected) {
                return;
            }

            if (result) {
                saveResult(userId, result);
                router.go('/test/result', { replace: true });
                return;
            }

            const data = await getCurrentTest();

            if (!page.isConnected) {
                return;
            }

            test = toTest(data);
            state = restoreState(draft, test);
            render();
        } catch (error) {
            console.error('Не удалось загрузить тест:', error);

            if (page.isConnected) {
                showModal({ ...ERROR_MODAL, onClose: load });
            }
        }
    }

    function goTo(index) {
        if (index < 0 || index >= total()) {
            return;
        }

        state.current = index;
        persist();
        render();
    }

    function goNext() {
        if (state.current < total() - 1) {
            goTo(state.current + 1);
            return;
        }

        goTo(test.questions.findIndex((question) => !isAnswered(state, question)));
    }

    async function submit() {
        if (state.isSubmitting || answeredCount() < total()) {
            return;
        }

        state.isSubmitting = true;
        render();

        try {
            const result = await sendTestResults(
                test.id,
                test.questions.map((question) => ({
                    question_id: question.id,
                    value: state.answers[question.id],
                })),
            );

            saveResult(userId, result);
            clearDraft(userId);

            if (page.isConnected) {
                router.go('/test/result');
            }
        } catch (error) {
            console.error('Не удалось отправить ответы теста:', error);
            state.isSubmitting = false;

            if (page.isConnected) {
                render();
                showModal({
                    ...ERROR_MODAL,
                    onClose: (returnValue) => {
                        if (returnValue === 'confirm') {
                            submit();
                        }
                    },
                });
            }
        }
    }

    function confirmSkip() {
        showModal({
            image: '/public/icons/skip-test-mascot.svg',
            title: 'Пропустить тест?',
            text: 'С тестом подбор анкет станет точнее: мы покажем, с кем у вас совпадают характер и ритм жизни.',
            buttonText: 'Вернуться к тесту',
            cancelText: 'Пропустить',
            onClose: (returnValue) => {
                if (returnValue === 'cancel') {
                    router.go('/');
                }
            },
        });
    }

    page.addEventListener('change', (event) => {
        if (event.target.classList.contains('scale__input') && !state.isSubmitting) {
            const question = test.questions[state.current];
            state.answers[question.id] = Number(event.target.value);
            persist();
            render();
        }
    });

    page.addEventListener('click', (event) => {
        if (event.target.closest('.test__skip')) {
            confirmSkip();
            return;
        }

        if (event.target.closest('.test__submit')) {
            submit();
            return;
        }

        if (event.target.closest('.test__next')) {
            goNext();
            return;
        }

        if (event.target.closest('.test__prev')) {
            goTo(state.current - 1);
            return;
        }

        const step = event.target.closest('.steps__item');
        if (step) {
            goTo(Number(step.dataset.index));
        }
    });

    load();
}
