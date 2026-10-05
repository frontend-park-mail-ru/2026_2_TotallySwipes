import {
    formFieldTemplate,
    initFormFieldToggles,
    setFormFieldError,
    validateFormFields,
} from '../form-field/form-field.js';
import {
    PASSWORD_HINT,
    validateEmail,
    validatePassword,
    validatePasswordConfirm,
} from '../../validation.js';
import { checkEmailAvailable, ApiError } from '../../api/api.js';

const EMAIL_TAKEN_MESSAGE = 'Почта уже занята';

/**
 * Проверяет на бэкенде, что почта свободна, и показывает ошибку у поля.
 *
 * @param {HTMLInputElement} input
 * @returns {Promise<boolean>}
 */
async function isEmailFree(input) {
    let message = null;

    try {
        if (!(await checkEmailAvailable(input.value))) {
            message = EMAIL_TAKEN_MESSAGE;
        }
    } catch (error) {
        if (error instanceof ApiError && error.status === 400) {
            message = Object.values(error.fields ?? {})[0] ?? error.message;
        }
    }

    setFormFieldError(input, message);

    if (message) {
        input.focus();
    }

    return message === null;
}

/**
 * Шаг 1: данные для входа. Сохраняет в data: email, password.
 */
export const accountStep = {
    template() {
        return Handlebars.templates['register-account/register-account']({
            email: formFieldTemplate({
                id: 'register-email',
                name: 'email',
                type: 'email',
                label: 'Email',
                placeholder: 'name@mail.ru',
                autocomplete: 'email',
            }),
            password: formFieldTemplate({
                id: 'register-password',
                name: 'password',
                type: 'password',
                label: 'Пароль',
                placeholder: 'Придумайте пароль',
                hint: PASSWORD_HINT,
                autocomplete: 'new-password',
            }),
            passwordConfirm: formFieldTemplate({
                id: 'register-password-confirm',
                name: 'passwordConfirm',
                type: 'password',
                label: 'Повторите пароль',
                placeholder: 'Введите пароль ещё раз',
                autocomplete: 'new-password',
            }),
        });
    },

    init(form, data) {
        initFormFieldToggles(form);

        const { email, password, passwordConfirm } = form.elements;

        email.value = data.email ?? '';
        password.value = data.password ?? '';
        passwordConfirm.value = data.password ?? '';

        form.addEventListener('input', (event) => {
            if (event.target.matches('.form-field__input')) {
                setFormFieldError(event.target, null);
            }

            if (event.target === password) {
                setFormFieldError(passwordConfirm, null);
            }
        });
    },

    async validate(form, data) {
        const { email, password, passwordConfirm } = form.elements;

        const isValid = validateFormFields([
            { input: email, validate: validateEmail },
            { input: password, validate: validatePassword },
            {
                input: passwordConfirm,
                validate: (value) => validatePasswordConfirm(password.value, value),
            },
        ]);

        if (!isValid) {
            return false;
        }

        if (!(await isEmailFree(email))) {
            return false;
        }

        data.email = email.value.trim();
        data.password = password.value;

        return true;
    },
};
