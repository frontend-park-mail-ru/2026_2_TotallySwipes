import { icons } from '../../icons.js';

export function formFieldTemplate(props, mix = '') {
    return Handlebars.templates['form-field/form-field']({
        ...props,
        toggle: props.type === 'password' ? icons.eye : '',
        mix,
    });
}

export function setFormFieldError(input, message) {
    const field = input.closest('.form-field');
    const error = field.querySelector('.form-field__error');

    field.classList.toggle('form-field--invalid', Boolean(message));
    input.setAttribute('aria-invalid', message ? 'true' : 'false');
    error.textContent = message ?? '';
    error.hidden = !message;
}

export function initFormFieldToggles(root) {
    root.querySelectorAll('.form-field__toggle').forEach((button) => {
        const input = button.parentElement.querySelector('.form-field__input');

        button.addEventListener('click', () => {
            const isHidden = input.type === 'password';
            input.type = isHidden ? 'text' : 'password';
            button.setAttribute('aria-label', isHidden ? 'Скрыть пароль' : 'Показать пароль');
        });
    });
}
