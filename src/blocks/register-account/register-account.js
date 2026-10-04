import { formFieldTemplate, initFormFieldToggles, setFormFieldError, validateFormFields } from '../form-field/form-field.js';
import { validateEmail, validatePassword } from '../../validation.js';
import { checkEmailAvailable, ApiError } from '../../api/api.js';

const EMAIL_TAKEN_MESSAGE = 'Почта уже занята';

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

// Шаг 1: Данные для входа. Сохраняет в data: email, password.
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
                autocomplete: 'new-password',
            }),
        });
    },

    init(form, data) {
        initFormFieldToggles(form);

        form.elements.email.value = data.email ?? '';
        form.elements.password.value = data.password ?? '';

        form.addEventListener('input', (event) => {
            if (event.target.matches('.form-field__input')) {
                setFormFieldError(event.target, null);
            }
        });
    },

    async validate(form, data) {
        const { email, password } = form.elements;

        const isValid = validateFormFields([
            { input: email, validate: validateEmail },
            { input: password, validate: validatePassword },
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
