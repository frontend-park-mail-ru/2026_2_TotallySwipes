import {
    formFieldTemplate,
    initFormFieldErrorReset,
    initFormFieldToggles,
    validateFormFields,
} from '../form-field/form-field.js';
import { validateEmail, validatePassword } from '../../validation.js';
import { login, ApiError } from '../../api/api.js';
import type { AuthResponse } from '../../api/api.types.js';
import { getElement } from '../../utils/dom.js';
import type { TypedForm } from '../../utils/dom.js';
import loginFormHbs from './login-form.hbs';

type LoginForm = TypedForm<{ email: HTMLInputElement; password: HTMLInputElement }>;

/**
 * Свойства формы входа для инициализации.
 */
export interface LoginFormProps {
    /** Вызывается после успешного входа с ответом бэкенда. */
    onLogin: (response: AuthResponse) => void;
}

const GENERIC_ERROR = 'Не удалось войти. Проверьте соединение и попробуйте ещё раз';

/**
 * Выбирает текст ошибки входа: сообщение бэкенда для ошибок 4xx, иначе общее.
 *
 * @param error - Ошибка запроса входа.
 * @returns Текст ошибки для пользователя.
 */
function loginErrorMessage(error: unknown): string {
    if (error instanceof ApiError && error.status < 500) {
        return error.message;
    }

    return GENERIC_ERROR;
}

/**
 * Рендерит форму входа.
 *
 * @returns HTML-строка формы входа.
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

    return loginFormHbs({ email, password });
}

/**
 * Вешает валидацию и отправку на форму входа.
 *
 * @param root - Контейнер формы входа.
 * @param props - Свойства формы входа.
 */
export function initLoginForm(root: HTMLElement, props: LoginFormProps) {
    initFormFieldToggles(root);

    const form = getElement<LoginForm>(root, '.login-form__form');
    const formError = getElement(form, '.login-form__error');
    const submitButton = getElement<HTMLButtonElement>(form, '.login-form__submit');
    const rules = [
        { input: form.elements.email, validate: validateEmail },
        { input: form.elements.password, validate: validatePassword },
    ];

    form.addEventListener('submit', async (event) => {
        event.preventDefault();

        if (!validateFormFields(rules)) {
            return;
        }

        formError.hidden = true;
        submitButton.disabled = true;

        let response: AuthResponse;

        try {
            response = await login(form.elements.email.value, form.elements.password.value);
        } catch (error) {
            formError.textContent = loginErrorMessage(error);
            formError.hidden = false;
            submitButton.disabled = false;
            return;
        }

        props.onLogin(response);
    });

    form.addEventListener('input', () => {
        formError.hidden = true;
    });

    initFormFieldErrorReset(form);
}
