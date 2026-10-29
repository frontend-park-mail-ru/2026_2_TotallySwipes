import { icons } from '../../icons.js';
import { getElement } from '../../utils/dom.js';
import formFieldHbs from './form-field.hbs';

/**
 * Свойства блока "Поле формы" для рендеринга.
 */
export interface FormFieldProps {
    /** Идентификатор input-а. Связывает его с подписью. */
    id: string;
    /** Имя input-а. */
    name: string;
    /** Тип input-а. У `password` появляется кнопка показа пароля. */
    type: 'text' | 'email' | 'password';
    /** Текст подписи над полем. */
    label: string;
    /** Подсказка внутри пустого поля. */
    placeholder?: string;
    /** Пояснение под полем. */
    hint?: string;
    /** Значение атрибута `autocomplete`. */
    autocomplete?: string;
    /** Дополнительные CSS-классы (БЭМ-микс) на корне поля. */
    mix?: string;
}

/**
 * Правило проверки одного поля формы.
 */
export interface FormFieldRule {
    /** Проверяемый input. */
    input: HTMLInputElement;
    /** Возвращает текст ошибки или `null`, если значение input-а валидное. */
    validate: (value: string) => string | null;
}

/**
 * Рендерит блок "Поле формы".
 *
 * @param props - Свойства для рендеринга поля формы.
 * @returns HTML-строка поля формы.
 */
export function formFieldTemplate(props: FormFieldProps): string {
    return formFieldHbs({
        ...props,
        toggle: props.type === 'password' ? icons.eye : '',
    });
}

/**
 * Инициализирует кнопки показа пароля во всех полях формы внутри `root`.
 *
 * @param root - Контейнер, внутри которого ищутся поля формы.
 */
export function initFormFieldToggles(root: HTMLElement): void {
    root.querySelectorAll('.form-field__toggle').forEach((button) => {
        const input = button.parentElement?.querySelector<HTMLInputElement>('.form-field__input');
        if (!input) return;

        button.addEventListener('click', () => {
            const isHidden = input.type === 'password';
            input.type = isHidden ? 'text' : 'password';
        });
    });
}

/**
 * Показывает ошибки у всех невалидных полей формы и фокусирует первое из них.
 *
 * @param rules - Правила проверки полей формы.
 * @returns `true`, если все поля формы валидны. `false`, если хотя бы одно поле формы невалидно.
 */
export function validateFormFields(rules: FormFieldRule[]): boolean {
    const invalid = rules.filter(({ input, validate }) => {
        const error = validate(input.value);
        setFormFieldError(input, error);
        return error !== null;
    });

    invalid[0]?.input.focus();

    return invalid.length === 0;
}

/**
 * Селектор полей, у которых {@link initFormFieldErrorReset} скрывает ошибку.
 */
const INPUT_SELECTOR = '.form-field__input, .chips__input';

/**
 * Скрывает ошибку поля формы, как только пользователь меняет его значение.
 *
 * @param root - Контейнер, внутри которого ищутся поля формы.
 * @param onReset - Вызывается после очистки ошибки с изменённым полем. Нужен,
 *     когда правка одного поля должна скрыть ошибку другого.
 */
export function initFormFieldErrorReset(
    root: HTMLElement,
    onReset?: (input: HTMLElement) => void,
): void {
    root.addEventListener('input', (event) => {
        if (!(event.target instanceof HTMLElement) || !event.target.matches(INPUT_SELECTOR)) {
            return;
        }

        setFormFieldError(event.target, null);
        onReset?.(event.target);
    });
}

/**
 * Показывает или скрывает ошибку у поля формы.
 *
 * @param input - Input внутри `.form-field`.
 * @param message - Текст ошибки. Если ошибку нужно очистить, передать `null`.
 */
export function setFormFieldError(input: HTMLElement, message: string | null): void {
    const field = input.closest('.form-field');

    if (!field) {
        throw new Error('Поле формы .form-field не найдено');
    }

    const error = getElement(field, '.form-field__error');

    field.classList.toggle('form-field_invalid', Boolean(message));
    error.textContent = message ?? '';
    error.hidden = !message;
}
