import { formFieldTemplate, initFormFieldToggles, setFormFieldError, validateFormFields } from '../form-field/form-field.js';
import { checkboxTemplate } from '../checkbox/checkbox.js';
import { validateEmail, validatePassword, validateAgreement } from '../../validation.js';

const AGREEMENT_TEXT = 'Мне есть 18 лет, я принимаю правила сервиса и политику конфиденциальности.';

// Шаг 1: Данные для входа. Сохраняет в data: email, password, agreed.
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
                hint: 'Минимум 8 символов',
            }),
            agreement: checkboxTemplate({
                id: 'register-agreement',
                name: 'agreement',
                text: AGREEMENT_TEXT,
            }),
        });
    },

    init(form, data) {
        initFormFieldToggles(form);

        form.elements.email.value = data.email ?? '';
        form.elements.password.value = data.password ?? '';
        form.elements.agreement.checked = data.agreed ?? false;

        form.addEventListener('input', (event) => {
            if (event.target.matches('.form-field__input, .checkbox__input')) {
                setFormFieldError(event.target, null);
            }
        });
    },

    validate(form, data) {
        const { email, password, agreement } = form.elements;

        const isValid = validateFormFields([
            { input: email, validate: validateEmail },
            { input: password, validate: validatePassword },
            { input: agreement, validate: () => validateAgreement(agreement.checked) },
        ]);

        if (!isValid) {
            return false;
        }

        data.email = email.value.trim();
        data.password = password.value;
        data.agreed = true;

        return true;
    },
};
