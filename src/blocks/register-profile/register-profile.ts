import {
    formFieldTemplate,
    initFormFieldErrorReset,
    validateFormFields,
} from '../form-field/form-field.js';
import { chipsTemplate } from '../chips/chips.js';
import {
    normalizeName,
    validateName,
    validateBirthDate,
    toIsoDate,
    validateSex,
} from '../../validation.js';
import { updateProfile } from '../../api/api.js';
import type { Sex } from '../../api/api.types.js';
import { asOption, firstRadio } from '../../utils/dom.js';
import type { TypedForm } from '../../utils/dom.js';
import type { RegisterStepLogicWithSave } from '../register-form/register-form.js';
import registerProfileHbs from './register-profile.hbs';

type ProfileForm = TypedForm<{
    name: HTMLInputElement;
    day: HTMLInputElement;
    month: HTMLSelectElement;
    year: HTMLInputElement;
    sex: RadioNodeList;
}>;

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

const SEX_CHIPS: { value: Sex; text: string }[] = [
    { value: 'female', text: 'Женщина' },
    { value: 'male', text: 'Мужчина' },
];

const SEX_VALUES = SEX_CHIPS.map(({ value }) => value);

/**
 * Шаг регистрации: о себе.
 */
export const profileStep: RegisterStepLogicWithSave = {
    template() {
        return registerProfileHbs({
            name: formFieldTemplate({
                id: 'register-name',
                name: 'name',
                type: 'text',
                label: 'Имя',
                placeholder: 'Как вас зовут',
                autocomplete: 'given-name',
            }),
            months: MONTHS,
            sex: chipsTemplate({ type: 'radio', name: 'sex', chips: SEX_CHIPS }),
        });
    },

    init(form: ProfileForm, data) {
        form.elements.name.value = data.name ?? '';
        form.elements.day.value = data.birthDay ?? '';
        form.elements.month.value = data.birthMonth ?? '';
        form.elements.year.value = data.birthYear ?? '';
        form.elements.sex.value = data.sex ?? '';

        initFormFieldErrorReset(form);
    },

    save(form: ProfileForm, data) {
        data.name = form.elements.name.value;
        data.birthDay = form.elements.day.value;
        data.birthMonth = form.elements.month.value;
        data.birthYear = form.elements.year.value;
        data.sex = asOption(SEX_VALUES, form.elements.sex.value);
    },

    validate(form: ProfileForm, data) {
        const { name, day, month, year } = form.elements;
        const sex = form.elements.sex;

        const isValid = validateFormFields([
            { input: name, validate: validateName },
            { input: day, validate: () => validateBirthDate(day.value, month.value, year.value) },
            { input: firstRadio(sex), validate: () => validateSex(sex.value) },
        ]);

        if (!isValid) {
            return false;
        }

        this.save(form, data);
        data.name = normalizeName(name.value);
        data.birthDate = toIsoDate(day.value, month.value, year.value);

        return true;
    },

    async submit(form, data) {
        await updateProfile({
            name: data.name,
            birth_date: data.birthDate,
            sex: data.sex,
        });
        return true;
    },
};
