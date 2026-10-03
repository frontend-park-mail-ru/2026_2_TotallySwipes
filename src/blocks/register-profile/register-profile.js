import { formFieldTemplate, setFormFieldError, validateFormFields } from '../form-field/form-field.js';
import { chipsTemplate } from '../chips/chips.js';
import { validateName, validateBirthDate, toIsoDate, validateSex } from '../../validation.js';

const MONTHS = [
    'января',
    'февраля',
    'марта',
    'апреля',
    'мая',
    'июня',
    'июля',
    'августа',
    'сентября',
    'октября',
    'ноября',
    'декабря',
].map((label, index) => ({ value: String(index + 1), label }));

const SEX_OPTIONS = [
    { value: 'female', label: 'Женщина' },
    { value: 'male', label: 'Мужчина' },
];


// Шаг 2: О себе. Сохраняет в data: name, birthDay, birthMonth, birthYear, birthDate, sex.
export const profileStep = {
    template() {
        return Handlebars.templates['register-profile/register-profile']({
            name: formFieldTemplate({
                id: 'register-name',
                name: 'name',
                type: 'text',
                label: 'Имя',
                placeholder: 'Как вас зовут',
                autocomplete: 'given-name',
            }),
            months: MONTHS,
            sex: chipsTemplate({ type: 'radio', name: 'sex', options: SEX_OPTIONS }),
        });
    },

    init(form, data) {
        form.elements.name.value = data.name ?? '';
        form.elements.day.value = data.birthDay ?? '';
        form.elements.month.value = data.birthMonth ?? '';
        form.elements.year.value = data.birthYear ?? '';
        form.elements.sex.value = data.sex ?? '';

        form.addEventListener('input', (event) => {
            if (event.target.matches('.form-field__input, .chips__input')) {
                setFormFieldError(event.target, null);
            }
        });
    },

    save(form, data) {
        data.name = form.elements.name.value;
        data.birthDay = form.elements.day.value;
        data.birthMonth = form.elements.month.value;
        data.birthYear = form.elements.year.value;
        data.sex = form.elements.sex.value;
    },

    validate(form, data) {
        const { name, day, month, year } = form.elements;
        const sex = form.elements.sex;

        const isValid = validateFormFields([
            { input: name, validate: validateName },
            { input: day, validate: () => validateBirthDate(day.value, month.value, year.value) },
            { input: sex[0], validate: () => validateSex(sex.value) },
        ]);

        if (!isValid) {
            return false;
        }

        this.save(form, data);
        data.name = data.name.trim();
        data.birthDate = toIsoDate(data.birthDay, data.birthMonth, data.birthYear);

        return true;
    },
};
