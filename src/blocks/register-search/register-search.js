import { setFormFieldError, validateFormFields } from '../form-field/form-field.js';
import { chipsTemplate } from '../chips/chips.js';
import { validateSearchAge, validateSearchSex, validateDatingGoal } from '../../validation.js';
import { DATING_GOALS } from '../../dating-goals.js';

const SEARCH_SEX_OPTIONS = [
    { value: 'female', label: 'Девушек' },
    { value: 'male', label: 'Парней' },
    { value: 'all', label: 'Всех' },
];

const DATING_GOAL_OPTIONS = DATING_GOALS.map(({ key, label }) => ({ value: key, label }));

/**
 * Шаг 3: кого ищете. Сохраняет в data: searchSex, searchAgeFrom, searchAgeTo, datingGoal.
 */
export const searchStep = {
    template() {
        return Handlebars.templates['register-search/register-search']({
            searchSex: chipsTemplate({
                type: 'radio',
                name: 'searchSex',
                options: SEARCH_SEX_OPTIONS,
            }),
            datingGoal: chipsTemplate({
                type: 'radio',
                name: 'datingGoal',
                options: DATING_GOAL_OPTIONS,
            }),
        });
    },

    init(form, data) {
        form.elements.searchSex.value = data.searchSex ?? '';
        form.elements.ageFrom.value = data.searchAgeFrom ?? '';
        form.elements.ageTo.value = data.searchAgeTo ?? '';
        form.elements.datingGoal.value = data.datingGoal ?? '';

        form.addEventListener('input', (event) => {
            if (event.target.matches('.form-field__input, .chips__input')) {
                setFormFieldError(event.target, null);
            }
        });
    },

    save(form, data) {
        data.searchSex = form.elements.searchSex.value;
        data.searchAgeFrom = form.elements.ageFrom.value.trim();
        data.searchAgeTo = form.elements.ageTo.value.trim();
        data.datingGoal = form.elements.datingGoal.value;
    },

    validate(form, data) {
        const { searchSex, ageFrom, ageTo, datingGoal } = form.elements;

        const isValid = validateFormFields([
            { input: searchSex[0], validate: () => validateSearchSex(searchSex.value) },
            { input: ageFrom, validate: () => validateSearchAge(ageFrom.value, ageTo.value) },
            { input: datingGoal[0], validate: () => validateDatingGoal(datingGoal.value) },
        ]);

        if (!isValid) {
            return false;
        }

        this.save(form, data);

        return true;
    },
};
