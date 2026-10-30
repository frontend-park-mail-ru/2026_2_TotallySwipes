import { setFormFieldError } from '../form-field/form-field.js';
import { chipsTemplate } from '../chips/chips.js';
import { validateSearchAge, validateSearchSex } from '../../validation.js';
import { SEARCH_SEX_OPTIONS } from '../../facts/facts.js';
import type { SearchFilter, SearchSex } from '../../api/api.types.js';
import searchFilterHbs from './search-filter.hbs';

/**
 * Значения полей фильтра в том виде, в каком они лежат в форме: строки, могут быть пустыми.
 */
export interface SearchFilterFields {
    sex: string;
    ageFrom: string;
    ageTo: string;
}

/**
 * @param {HTMLFormElement} form - Форма, в которую вставлен фильтр.
 * @returns Инпуты фильтра.
 */
function filterInputs(form: HTMLFormElement) {
    const { elements } = form;

    return {
        sex: elements.namedItem('searchSex') as RadioNodeList,
        ageFrom: elements.namedItem('ageFrom') as HTMLInputElement,
        ageTo: elements.namedItem('ageTo') as HTMLInputElement,
    };
}

/**
 * @param {string} id - Префикс id полей, должен быть уникальным на странице.
 * @param {string} [mix]
 * @returns {string} HTML полей фильтра: кого показывать и возраст от/до.
 */
export function searchFilterTemplate(id: string, mix = ''): string {
    return searchFilterHbs({
        id,
        mix,
        sex: chipsTemplate({ type: 'radio', name: 'searchSex', chips: SEARCH_SEX_OPTIONS }),
    });
}

/**
 * Подставляет значения в поля фильтра.
 *
 * @param {HTMLFormElement} form
 * @param {Partial<SearchFilterFields>} fields - Без значения - пустое поле.
 */
export function fillSearchFilter(form: HTMLFormElement, fields: Partial<SearchFilterFields>) {
    const { sex, ageFrom, ageTo } = filterInputs(form);

    sex.value = fields.sex ?? '';
    ageFrom.value = fields.ageFrom ?? '';
    ageTo.value = fields.ageTo ?? '';
}

/**
 * Заполняет поля фильтра и снимает ошибку с поля, когда его меняют.
 *
 * @param {HTMLFormElement} form
 * @param {Partial<SearchFilterFields>} fields - Начальные значения, без значения - пустое поле.
 */
export function initSearchFilter(form: HTMLFormElement, fields: Partial<SearchFilterFields>) {
    fillSearchFilter(form, fields);

    form.querySelector('.search-filter')?.addEventListener('input', (event) => {
        setFormFieldError(event.target as HTMLInputElement, null);
    });
}

/**
 * Читает поля без проверки.
 *
 * @param {HTMLFormElement} form
 * @returns {SearchFilterFields}
 */
export function readSearchFilter(form: HTMLFormElement): SearchFilterFields {
    const { sex, ageFrom, ageTo } = filterInputs(form);

    return {
        sex: sex.value,
        ageFrom: ageFrom.value.trim(),
        ageTo: ageTo.value.trim(),
    };
}

/**
 * Правила проверки для validateFormFields. Возвращает правила, а не результат,
 * чтобы их можно было проверить вместе с другими полями формы.
 *
 * @param {HTMLFormElement} form
 * @returns Правила для полей пола и возраста.
 */
export function searchFilterRules(form: HTMLFormElement) {
    const { sex, ageFrom, ageTo } = filterInputs(form);

    return [
        { input: sex[0] as HTMLInputElement, validate: () => validateSearchSex(sex.value) },
        { input: ageFrom, validate: () => validateSearchAge(ageFrom.value, ageTo.value) },
    ];
}

/**
 * @param {SearchFilterFields} fields - Проверенные значения полей.
 * @returns {SearchFilter} Фильтр для бэкенда.
 */
export function toSearchFilter({ sex, ageFrom, ageTo }: SearchFilterFields): SearchFilter {
    return {
        sex: sex as SearchSex,
        age_from: Number(ageFrom),
        age_to: Number(ageTo),
    };
}

/**
 * @param {SearchFilter} filter - Фильтр с бэкенда.
 * @returns {SearchFilterFields} Значения для полей формы.
 */
export function fromSearchFilter(filter: SearchFilter): SearchFilterFields {
    return {
        sex: filter.sex,
        ageFrom: String(filter.age_from),
        ageTo: String(filter.age_to),
    };
}
