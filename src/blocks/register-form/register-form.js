import { stepProgressTemplate } from '../step-progress/step-progress.js';
import { accountStep } from '../register-account/register-account.js';
import { profileStep } from '../register-profile/register-profile.js';
import { searchStep } from '../register-search/register-search.js';
import { photosStep } from '../register-photos/register-photos.js';
import { interestsStep } from '../register-interests/register-interests.js';
import { setFormFieldError } from '../form-field/form-field.js';
import { register, APIError } from '../../api/api.js';
import { icons } from '../../icons.js';

const NEXT_LABEL = 'Продолжить';
const FINISH_LABEL = 'Готово — к тесту';
const GENERIC_ERROR_MESSAGE = 'Не удалось завершить регистрацию. Проверьте соединение и попробуйте ещё раз.';
const EMAIL_TAKEN_STATUS = 409;

function registerErrorMessage(error) {
    if (error instanceof APIError && error.status < 500) {
        return error.message;
    }

    return GENERIC_ERROR_MESSAGE;
}

// Шаг: { title, subtitle, template?(data), init?(form, data), save?(form, data), validate?(form, data) }.
// validate при успехе сама сохраняет введённые значения в data и возвращает true.
// save запоминает введённое без проверки, когда пользователь возвращается на шаг назад.
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

export function registerFormTemplate() {
    return '<div class="register-form"></div>';
}

export function initRegisterForm(root, { onRegistered } = {}) {
    // Введённые на каждом шаге данные живут только пока открыта страница регистрации.
    const data = {};
    let isSubmitting = false;

    function setActionsDisabled(form, disabled) {
        form.querySelectorAll('.register-form__actions .button').forEach((button) => {
            button.disabled = disabled;
        });
    }

    async function submit(form) {
        const formError = form.querySelector('.register-form__error');

        isSubmitting = true;
        formError.hidden = true;
        setActionsDisabled(form, true);

        try {
            await register(data);
        } catch (error) {
            isSubmitting = false;

            if (error instanceof APIError && error.status === EMAIL_TAKEN_STATUS) {
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

        form.addEventListener('submit', (event) => {
            event.preventDefault();

            if (isSubmitting) {
                return;
            }

            if (step.validate && !step.validate(form, data)) {
                return;
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
