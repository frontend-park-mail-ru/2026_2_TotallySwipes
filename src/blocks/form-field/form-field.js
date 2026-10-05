import { icons } from '../../icons.js';

/**
 * @param {Object} props - Атрибуты поля: id, name, type, label, placeholder, hint, autocomplete.
 * @param {string} [mix]
 * @returns {string} HTML поля формы. У поля пароля есть кнопка показа.
 */
export function formFieldTemplate(props, mix = '') {
    return Handlebars.templates['form-field/form-field']({
        ...props,
        toggle: props.type === 'password' ? icons.eye : '',
        mix,
    });
}

/**
 * Показывает или скрывает ошибку у поля.
 *
 * @param {HTMLElement} input - Инпут внутри .form-field.
 * @param {string|null} message - Текст ошибки, null - убрать ошибку.
 */
export function setFormFieldError(input, message) {
    const field = input.closest('.form-field');
    const error = field.querySelector('.form-field__error');

    field.classList.toggle('form-field_invalid', Boolean(message));
    error.textContent = message ?? '';
    error.hidden = !message;
}

/**
 * Показывает ошибки у всех невалидных полей и фокусирует первое из них.
 *
 * @param {{input: HTMLInputElement, validate: function(string): (string|null)}[]} rules
 *     validate возвращает текст ошибки или null.
 * @returns {boolean} true, если все поля валидны.
 */
export function validateFormFields(rules) {
    const invalid = rules.filter(({ input, validate }) => {
        const error = validate(input.value);
        setFormFieldError(input, error);
        return error !== null;
    });

    invalid[0]?.input.focus();

    return invalid.length === 0;
}

/**
 * Включает кнопки показа пароля во всех полях внутри root.
 *
 * @param {HTMLElement} root
 */
export function initFormFieldToggles(root) {
    root.querySelectorAll('.form-field__toggle').forEach((button) => {
        const input = button.parentElement.querySelector('.form-field__input');

        button.addEventListener('click', () => {
            const isHidden = input.type === 'password';
            input.type = isHidden ? 'text' : 'password';
        });
    });
}
