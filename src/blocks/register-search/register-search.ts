import { initFormFieldErrorReset, validateFormFields } from '../form-field/form-field.js';
import { chipsTemplate } from '../chips/chips.js';
import { validateSearchAge, validateSearchSex, validateDatingGoal } from '../../validation.js';
import { DATING_GOALS } from '../../dating-goals.js';
import { updateProfile, setSearchFilter } from '../../api/api.js';
import type { SearchSex } from '../../api/api.types.js';
import { asOption, firstRadio } from '../../utils/dom.js';
import type { TypedForm } from '../../utils/dom.js';
import type { RegisterStepLogicWithSave } from '../register-form/register-form.js';
import registerSearchHbs from './register-search.hbs';

type SearchForm = TypedForm<{
    searchSex: RadioNodeList;
    ageFrom: HTMLInputElement;
    ageTo: HTMLInputElement;
    datingGoal: RadioNodeList;
}>;

const SEARCH_SEX_CHIPS: { value: SearchSex; text: string }[] = [
    { value: 'female', text: 'Девушек' },
    { value: 'male', text: 'Парней' },
    { value: 'all', text: 'Всех' },
];

const SEARCH_SEX_VALUES = SEARCH_SEX_CHIPS.map(({ value }) => value);

const DATING_GOAL_CHIPS = DATING_GOALS.map(({ key, label }) => ({ value: key, text: label }));

const DATING_GOAL_VALUES = DATING_GOALS.map(({ key }) => key);

/**
 * Шаг регистрации: кого ищете.
 */
export const searchStep: RegisterStepLogicWithSave = {
    template() {
        return registerSearchHbs({
            searchSex: chipsTemplate({
                type: 'radio',
                name: 'searchSex',
                chips: SEARCH_SEX_CHIPS,
            }),
            datingGoal: chipsTemplate({
                type: 'radio',
                name: 'datingGoal',
                chips: DATING_GOAL_CHIPS,
            }),
        });
    },

    init(form: SearchForm, data) {
        form.elements.searchSex.value = data.searchSex ?? '';
        form.elements.ageFrom.value = data.searchAgeFrom ?? '';
        form.elements.ageTo.value = data.searchAgeTo ?? '';
        form.elements.datingGoal.value = data.datingGoal ?? '';

        initFormFieldErrorReset(form);
    },

    save(form: SearchForm, data) {
        data.searchSex = asOption(SEARCH_SEX_VALUES, form.elements.searchSex.value);
        data.searchAgeFrom = form.elements.ageFrom.value.trim();
        data.searchAgeTo = form.elements.ageTo.value.trim();
        data.datingGoal = asOption(DATING_GOAL_VALUES, form.elements.datingGoal.value);
    },

    validate(form: SearchForm, data) {
        const { searchSex, ageFrom, ageTo, datingGoal } = form.elements;

        const isValid = validateFormFields([
            { input: firstRadio(searchSex), validate: () => validateSearchSex(searchSex.value) },
            { input: ageFrom, validate: () => validateSearchAge(ageFrom.value, ageTo.value) },
            { input: firstRadio(datingGoal), validate: () => validateDatingGoal(datingGoal.value) },
        ]);

        if (!isValid) {
            return false;
        }

        this.save(form, data);

        return true;
    },

    async submit(form, data) {
        const { searchSex, searchAgeFrom, searchAgeTo, datingGoal } = data;

        if (
            searchSex === undefined ||
            searchAgeFrom === undefined ||
            searchAgeTo === undefined ||
            datingGoal === undefined
        ) {
            throw new Error('Шаг поиска: validate не заполнил данные');
        }

        await updateProfile({ dating_goal: datingGoal });
        await setSearchFilter({
            sex: searchSex,
            age_from: Number(searchAgeFrom),
            age_to: Number(searchAgeTo),
        });
        return true;
    },
};
