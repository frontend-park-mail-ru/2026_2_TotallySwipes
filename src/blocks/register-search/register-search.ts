import { setFormFieldError, validateFormFields } from '../form-field/form-field.js';
import { chipsTemplate } from '../chips/chips.js';
import {
    searchFilterTemplate,
    initSearchFilter,
    readSearchFilter,
    searchFilterRules,
    toSearchFilter,
    type SearchFilterFields,
} from '../search-filter/search-filter.js';
import { validateDatingGoal } from '../../validation.js';
import { DATING_GOALS } from '../../facts/facts.js';
import { updateProfile, setSearchFilter } from '../../api/api.js';
import type { DatingGoal } from '../../api/api.types.js';
// import { validateSearchAge, validateSearchSex, validateDatingIntent } from '../../validation.js';
import registerSearchHbs from './register-search.hbs';

/**
 * Поля data регистрации, которые заполняет этот шаг. Пустые, пока пользователь их не ввёл.
 */
interface SearchStepData {
    searchSex?: string;
    searchAgeFrom?: string;
    searchAgeTo?: string;
    datingGoal?: string;
}

const DATING_GOAL_OPTIONS = DATING_GOALS.map(({ key, label }) => ({ value: key, text: label }));

/**
 * @param {SearchStepData} data - data шагов регистрации.
 * @returns {Partial<SearchFilterFields>} Значения для полей фильтра.
 */
function filterFields(data: SearchStepData): Partial<SearchFilterFields> {
    return { sex: data.searchSex, ageFrom: data.searchAgeFrom, ageTo: data.searchAgeTo };
}

/**
 * @param {HTMLFormElement} form
 * @returns {RadioNodeList} Чипы цели знакомства.
 */
function datingGoalInput(form: HTMLFormElement): RadioNodeList {
    return form.elements.namedItem('datingGoal') as RadioNodeList;
}

/**
 * Шаг 3: кого ищете. Сохраняет в data: searchSex, searchAgeFrom, searchAgeTo, datingGoal.
 */
export const searchStep = {
    template(): string {
        return registerSearchHbs({
            searchFilter: searchFilterTemplate('register-search'),
            datingGoal: chipsTemplate({
                type: 'radio',
                name: 'datingGoal',
                chips: DATING_GOAL_OPTIONS,
            }),
        });
    },

    init(form: HTMLFormElement, data: SearchStepData) {
        initSearchFilter(form, filterFields(data));
        datingGoalInput(form).value = data.datingGoal ?? '';

        form.addEventListener('input', (event) => {
            const target = event.target as HTMLInputElement;

            if (target.name === 'datingGoal') {
                setFormFieldError(target, null);
            }
        });
    },

    save(form: HTMLFormElement, data: SearchStepData) {
        const { sex, ageFrom, ageTo } = readSearchFilter(form);

        data.searchSex = sex;
        data.searchAgeFrom = ageFrom;
        data.searchAgeTo = ageTo;
        data.datingGoal = datingGoalInput(form).value;
    },

    validate(form: HTMLFormElement, data: SearchStepData): boolean {
        const datingGoal = datingGoalInput(form);

        const isValid = validateFormFields([
            ...searchFilterRules(form),
            {
                input: datingGoal[0] as HTMLInputElement,
                validate: () => validateDatingGoal(datingGoal.value),
            },
        ]);

        if (!isValid) {
            return false;
        }

        this.save(form, data);

        return true;
    },

    // Вызывается после validate, поэтому все поля data уже заполнены и проверены.
    async submit(_form: HTMLFormElement, data: SearchStepData): Promise<boolean> {
        await updateProfile({ dating_goal: data.datingGoal as DatingGoal });
        await setSearchFilter(toSearchFilter(filterFields(data) as SearchFilterFields));
        return true;
    },
};
