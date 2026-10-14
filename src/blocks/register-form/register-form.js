import { stepProgressTemplate } from '../step-progress/step-progress.js';
import { accountStep } from '../register-account/register-account.js';
import { profileStep } from '../register-profile/register-profile.js';
import { searchStep } from '../register-search/register-search.js';
import { photosStep } from '../register-photos/register-photos.js';
import { interestsStep } from '../register-interests/register-interests.js';
import { showModal } from '../modal/modal.js';
import { ApiError, getProfile, getSearchFilter } from '../../api/api.js';
import { icons } from '../../icons.js';
import registerFormHbs from './register-form.hbs';

const NEXT_LABEL = 'Продолжить';
const FINISH_LABEL = 'Готово — к тесту';
const GENERIC_ERROR_MESSAGE =
    'Не удалось сохранить данные. Проверьте соединение и попробуйте ещё раз.';
const LOAD_ERROR_MODAL = {
    image: '/public/icons/mascot-error.svg',
    title: 'Произошла ошибка',
    text: 'Похоже, что пропала связь. Попробуйте ещё раз.',
    buttonText: 'Повторить',
};

/**
 * @param {*} error
 * @returns {string} Сообщение бэкенда с причинами по полям или общее сообщение.
 */
function registerErrorMessage(error) {
    if (error instanceof ApiError && error.status < 500) {
        const reasons = Object.values(error.fields ?? {});

        return reasons.length > 0 ? `${error.message}: ${reasons.join('; ')}` : error.message;
    }

    return GENERIC_ERROR_MESSAGE;
}

/**
 * @typedef {Object} RegisterStep
 * @property {string} title
 * @property {string} subtitle
 * @property {string[]} [fields] - Поля из missing бэкенда, которые заполняет шаг.
 * @property {function(Object): string} [template] - HTML тела шага.
 * @property {function(HTMLFormElement, Object): void} [init] - Заполняет поля из data.
 * @property {function(HTMLFormElement, Object): void} [save] - Запоминает введённое без проверки,
 *     когда пользователь возвращается на шаг назад.
 * @property {function(HTMLFormElement, Object): (boolean|Promise<boolean>)} [validate] - При успехе
 *     сама сохраняет введённые значения в data и возвращает true. Может быть async.
 * @property {function(HTMLFormElement, Object): Promise<boolean>} [submit] - Отправляет данные шага
 *     на бэкенд после validate. false - остаться на шаге (ошибку шаг показал сам),
 *     исключение - показать общую ошибку формы.
 */

/** @type {RegisterStep[]} */
const STEPS = [
    {
        title: 'Создайте аккаунт!',
        subtitle: 'Займёт пару минут. Анкету можно поменять потом.',
        ...accountStep,
    },
    {
        title: 'Расскажите о себе!',
        subtitle: 'Имя и возраст увидят в вашей анкете.',
        fields: ['name', 'birth_date', 'sex'],
        ...profileStep,
    },
    {
        title: 'Кого вы ищете?',
        subtitle: 'Поменять можно в любой момент в фильтрах.',
        fields: ['dating_goal', 'search_filter'],
        ...searchStep,
    },
    {
        title: 'Добавьте фото!',
        subtitle:
            'Хотя бы одно, где хорошо видно лицо. Первое станет главным — порядок меняется перетаскиванием.',
        fields: ['photos'],
        ...photosStep,
    },
    {
        title: 'Что вам интересно?',
        subtitle: 'Выберите до 7 интересов — по ним проще начать разговор.',
        ...interestsStep,
    },
];

/**
 * Переводит сохранённые на бэкенде анкету и фильтр в data шагов.
 *
 * @param {Object} profile - Ответ GET /profile/me.
 * @param {{sex: string, age_from: number, age_to: number}} filter - Ответ GET /filters/me.
 * @returns {Object} data для шагов, поля без значения - undefined.
 */
function profileToData(profile, filter) {
    const [birthYear, birthMonth, birthDay] = profile.birth_date?.split('-') ?? [];
    // Пока фильтр не задан, бэкенд отдаёт значения по умолчанию, а не выбор пользователя.
    const hasFilter = !profile.missing.includes('search_filter');

    return {
        registered: true,
        name: profile.name ?? undefined,
        birthDay: birthDay && String(Number(birthDay)),
        birthMonth: birthMonth && String(Number(birthMonth)),
        birthYear,
        sex: profile.sex ?? undefined,
        datingGoal: profile.dating_goal ?? undefined,
        searchSex: hasFilter ? filter.sex : undefined,
        searchAgeFrom: hasFilter ? String(filter.age_from) : undefined,
        searchAgeTo: hasFilter ? String(filter.age_to) : undefined,
        photos: profile.photos,
        interests: profile.tags,
    };
}

/**
 * @returns {string} Контейнер формы, шаги рендерит initRegisterForm.
 */
export function registerFormTemplate() {
    return '<div class="register-form"></div>';
}

/**
 * Запускает пошаговую регистрацию. Введённые данные живут, пока открыта страница.
 *
 * @param {HTMLElement} root
 * @param {Object} [params]
 * @param {boolean} [params.resume=false] - Аккаунт уже создан: подтянуть анкету с бэкенда
 *     и начать с первого шага, где не хватает данных.
 * @param {Function} [params.onRegistered] - Вызывается после успешной регистрации.
 */
export function initRegisterForm(root, { resume = false, onRegistered } = {}) {
    const data = {};
    let isSubmitting = false;

    function setActionsDisabled(form, disabled) {
        form.querySelectorAll('.register-form__actions .button').forEach((button) => {
            button.disabled = disabled;
        });
    }

    /**
     * Проверяет и отправляет текущий шаг.
     *
     * @param {RegisterStep} step
     * @param {HTMLFormElement} form
     * @returns {Promise<boolean>} Можно ли идти дальше.
     */
    async function completeStep(step, form) {
        const formError = form.querySelector('.register-form__error');
        formError.hidden = true;

        try {
            const isValid = (await step.validate?.(form, data)) ?? true;

            return isValid && ((await step.submit?.(form, data)) ?? true);
        } catch (error) {
            formError.textContent = registerErrorMessage(error);
            formError.hidden = false;

            return false;
        }
    }

    /**
     * После создания аккаунта на шаг с почтой вернуться нельзя.
     *
     * @param {number} index - Индекс шага в STEPS.
     */
    function showStep(index) {
        const step = STEPS[index];
        const isLast = index === STEPS.length - 1;

        root.innerHTML = registerFormHbs({
            progress: stepProgressTemplate(index + 1, STEPS.length),
            title: step.title,
            subtitle: step.subtitle,
            body: step.template?.(data) ?? '',
            hasBack: index > (data.registered ? 1 : 0),
            isFirst: index === 0,
            nextLabel: isLast ? FINISH_LABEL : NEXT_LABEL,
            arrow: icons.arrow,
        });

        const form = root.querySelector('.register-form__form');
        step.init?.(form, data);

        form.addEventListener('submit', async (event) => {
            event.preventDefault();

            if (isSubmitting) {
                return;
            }

            isSubmitting = true;
            setActionsDisabled(form, true);

            const isDone = await completeStep(step, form);

            isSubmitting = false;

            if (!isDone) {
                setActionsDisabled(form, false);
                return;
            }

            if (isLast) {
                onRegistered?.();
                return;
            }

            showStep(index + 1);
        });

        form.addEventListener('input', () => {
            form.querySelector('.register-form__error').hidden = true;
        });

        form.querySelector('.register-form__back')?.addEventListener('click', () => {
            if (isSubmitting) {
                return;
            }

            step.save?.(form, data);
            showStep(index - 1);
        });
    }

    /**
     * Продолжает регистрацию уже созданного аккаунта, например после обновления страницы.
     */
    async function resumeRegistration() {
        let profile;
        let filter;

        try {
            [profile, filter] = await Promise.all([getProfile(), getSearchFilter()]);
        } catch (error) {
            console.error('Не удалось загрузить анкету:', error);

            if (root.isConnected) {
                showModal({ ...LOAD_ERROR_MODAL, onClose: resumeRegistration });
            }
            return;
        }

        if (!root.isConnected) {
            return;
        }

        if (profile.missing.length === 0) {
            onRegistered?.();
            return;
        }

        Object.assign(data, profileToData(profile, filter));

        const index = STEPS.findIndex((step) =>
            step.fields?.some((field) => profile.missing.includes(field)),
        );
        // Незнакомое поле в missing: начинаем с первого шага анкеты.
        showStep(index === -1 ? 1 : index);
    }

    if (resume) {
        resumeRegistration();
    } else {
        showStep(0);
    }
}
