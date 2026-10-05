import { stepProgressTemplate } from '../step-progress/step-progress.js';
import { accountStep } from '../register-account/register-account.js';
import { profileStep } from '../register-profile/register-profile.js';
import { searchStep } from '../register-search/register-search.js';
import { photosStep } from '../register-photos/register-photos.js';
import { interestsStep } from '../register-interests/register-interests.js';
import { setFormFieldError } from '../form-field/form-field.js';
import { register, ApiError } from '../../api/api.js';
import { icons } from '../../icons.js';

const NEXT_LABEL = 'Продолжить';
const FINISH_LABEL = 'Готово — к тесту';
const GENERIC_ERROR_MESSAGE =
    'Не удалось завершить регистрацию. Проверьте соединение и попробуйте ещё раз.';
const EMAIL_TAKEN_STATUS = 409;

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
 * @property {function(Object): string} [template] - HTML тела шага.
 * @property {function(HTMLFormElement, Object): void} [init] - Заполняет поля из data.
 * @property {function(HTMLFormElement, Object): void} [save] - Запоминает введённое без проверки,
 *     когда пользователь возвращается на шаг назад.
 * @property {function(HTMLFormElement, Object): (boolean|Promise<boolean>)} [validate] - При успехе
 *     сама сохраняет введённые значения в data и возвращает true. Может быть async.
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
        ...profileStep,
    },
    {
        title: 'Кого вы ищете?',
        subtitle: 'Поменять можно в любой момент в фильтрах.',
        ...searchStep,
    },
    {
        title: 'Добавьте фото!',
        subtitle: 'Хотя бы одно, где хорошо видно лицо. Первое станет главным.',
        ...photosStep,
    },
    {
        title: 'Что вам интересно?',
        subtitle: 'Выберите до 7 интересов — по ним проще начать разговор.',
        ...interestsStep,
    },
];

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
 * @param {Function} [params.onRegistered] - Вызывается после успешной регистрации.
 */
export function initRegisterForm(root, { onRegistered } = {}) {
    const data = {};
    let isSubmitting = false;

    function setActionsDisabled(form, disabled) {
        form.querySelectorAll('.register-form__actions .button').forEach((button) => {
            button.disabled = disabled;
        });
    }

    /**
     * Отправляет регистрацию. Если почта занята, возвращает на первый шаг.
     *
     * @param {HTMLFormElement} form
     */
    async function submit(form) {
        const formError = form.querySelector('.register-form__error');

        isSubmitting = true;
        formError.hidden = true;
        setActionsDisabled(form, true);

        try {
            await register(data);
        } catch (error) {
            isSubmitting = false;

            if (error instanceof ApiError && error.status === EMAIL_TAKEN_STATUS) {
                showStep(0);

                const email = root.querySelector('[name="email"]');
                setFormFieldError(email, error.message);
                email.focus();

                return;
            }

            formError.textContent = registerErrorMessage(error);
            formError.hidden = false;
            setActionsDisabled(form, false);

            return;
        }

        onRegistered?.();
    }

    /**
     * @param {number} index - Индекс шага в STEPS.
     */
    function showStep(index) {
        const step = STEPS[index];
        const isLast = index === STEPS.length - 1;

        root.innerHTML = Handlebars.templates['register-form/register-form']({
            progress: stepProgressTemplate(index + 1, STEPS.length),
            title: step.title,
            subtitle: step.subtitle,
            body: step.template?.(data) ?? '',
            hasBack: index > 0,
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

            if (step.validate) {
                setActionsDisabled(form, true);

                const isValid = await step.validate(form, data);

                setActionsDisabled(form, false);

                if (!isValid) {
                    return;
                }
            }

            if (isLast) {
                submit(form);
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

    showStep(0);
}
