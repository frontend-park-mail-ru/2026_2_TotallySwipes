import {
    formFieldTemplate,
    initFormFieldToggles,
    setFormFieldError,
} from '../form-field/form-field.js';
import { validateEmail, validatePassword } from '../../validation.js';
import { login, ApiError } from '../../api/api.js';

const GENERIC_ERROR = 'Не удалось войти. Проверьте соединение и попробуйте ещё раз';

/**
 * @param {*} error
 * @returns {string} Сообщение бэкенда для ошибок 4xx, иначе общее сообщение.
 */
function loginErrorMessage(error) {
    if (error instanceof ApiError && error.status < 500) {
        return error.message;
    }

    return GENERIC_ERROR;
}

/**
 * @returns {string} HTML формы входа.
 */
export function loginFormTemplate() {
    const email = formFieldTemplate({
        id: 'login-email',
        name: 'email',
        type: 'email',
        label: 'Email',
        placeholder: 'name@mail.ru',
        autocomplete: 'email',
    });

    const password = formFieldTemplate({
        id: 'login-password',
        name: 'password',
        type: 'password',
        label: 'Пароль',
        placeholder: 'Ваш пароль',
        autocomplete: 'current-password',
    });

    return Handlebars.templates['login-form/login-form']({ email, password });
}

/**
 * Вешает валидацию и отправку на форму входа.
 *
 * @param {HTMLElement} root
 * @param {Object} params
 * @param {Function} params.onSuccess - Вызывается после успешного входа.
 */
export function initLoginForm(root, { onSuccess }) {
    initFormFieldToggles(root);

    const form = root.querySelector('.login-form__form');
    const formError = form.querySelector('.login-form__error');
    const submitButton = form.querySelector('.login-form__submit');
    const rules = [
        { input: form.elements.email, validate: validateEmail },
        { input: form.elements.password, validate: validatePassword },
    ];

    form.addEventListener('submit', async (event) => {
        event.preventDefault();

        const invalid = rules.filter(({ input, validate }) => {
            const error = validate(input.value);
            setFormFieldError(input, error);
            return error !== null;
        });

        if (invalid.length > 0) {
            invalid[0].input.focus();
            return;
        }

        formError.hidden = true;
        submitButton.disabled = true;

        try {
            await login(form.elements.email.value, form.elements.password.value);
        } catch (error) {
            formError.textContent = loginErrorMessage(error);
            formError.hidden = false;
            submitButton.disabled = false;
            return;
        }

        // TODO: если profile_completed === false, отправлять на заполнение анкеты
        onSuccess();
    });

    form.addEventListener('input', (event) => {
        formError.hidden = true;

        if (event.target.classList.contains('form-field__input')) {
            setFormFieldError(event.target, null);
        }
    });
}
