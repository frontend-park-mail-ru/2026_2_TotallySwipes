import { setFormFieldError, validateFormFields } from '../form-field/form-field.js';
import { chipsTemplate } from '../chips/chips.js';
import { validateSearchAge, validateSearchSex, validateDatingIntent } from '../../validation.js';

const SEARCH_SEX_OPTIONS = [
    { value: 'female', label: 'Девушек' },
    { value: 'male', label: 'Парней' },
    { value: 'all', label: 'Всех' },
];

const DATING_INTENT_OPTIONS = [
    { value: 'Ищу половинку', label: 'Отношения' },
    { value: 'Ищу встречи', label: 'Дружба' },
    { value: 'Ищу общение', label: 'Общение' },
];


// Шаг 3: Кого ищете. Сохраняет в data: searchSex, searchAgeFrom, searchAgeTo, datingIntent.
export const searchStep = {
    template() {
        return Handlebars.templates['register-search/register-search']({
            searchSex: chipsTemplate({ type: 'radio', name: 'searchSex', options: SEARCH_SEX_OPTIONS }),
            datingIntent: chipsTemplate({ type: 'radio', name: 'datingIntent', options: DATING_INTENT_OPTIONS }),
        });
    },

    init(form, data) {
        form.elements.searchSex.value = data.searchSex ?? '';
        form.elements.ageFrom.value = data.searchAgeFrom ?? '';
        form.elements.ageTo.value = data.searchAgeTo ?? '';
        form.elements.datingIntent.value = data.datingIntent ?? '';

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
        data.datingIntent = form.elements.datingIntent.value;
    },

    validate(form, data) {
        const { searchSex, ageFrom, ageTo, datingIntent } = form.elements;

        const isValid = validateFormFields([
            { input: searchSex[0], validate: () => validateSearchSex(searchSex.value) },
            { input: ageFrom, validate: () => validateSearchAge(ageFrom.value, ageTo.value) },
            { input: datingIntent[0], validate: () => validateDatingIntent(datingIntent.value) },
        ]);

        if (!isValid) {
            return false;
        }

        this.save(form, data);

        return true;
    },
};
