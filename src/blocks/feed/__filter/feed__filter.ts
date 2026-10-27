import {
    searchFilterTemplate,
    fillSearchFilter,
    readSearchFilter,
    searchFilterRules,
    toSearchFilter,
    fromSearchFilter,
} from '../../search-filter/search-filter.js';
import { setFormFieldError } from '../../form-field/form-field.js';
import { showModal } from '../../modal/modal.js';
import { getProfile, getSearchFilter, setSearchFilter } from '../../../api/api.js';
import type { DatingGoal, SearchFilter, SearchSex } from '../../../api/api.types.js';
import { DATING_GOALS } from '../../../facts/facts.js';
import { getElement } from '../../../dom.js';
import feedFilterHbs from './feed__filter.hbs';

export interface FeedFilterData {
    label: string;
    hint?: string;
}

export interface FeedFilterParams {
    onApply: (filter: SearchFilter) => void;
}

/**
 * Подписи пола на кнопке. В SEARCH_SEX_OPTIONS другой падеж: «Показывать девушек».
 */
const SEX_LABELS: Record<SearchSex, string> = {
    female: 'Девушки',
    male: 'Парни',
    all: 'Все',
};

const SAVE_ERROR_MODAL = {
    image: '/icons/mascot-error.svg',
    title: 'Произошла ошибка',
    text: 'Не удалось сохранить фильтр, похоже, что пропала связь. Попробуйте ещё раз.',
};

/**
 * @param {Object} params
 * @param {string} params.label - Текст кнопки, например «Девушки, 22–28».
 * @param {string} [params.hint] - Серая подпись после точки, например цель знакомства.
 * @returns {string} HTML кнопки фильтра и скрытой панели с формой.
 */
export function feedFilterTemplate({ label, hint }: FeedFilterData): string {
    return feedFilterHbs({
        label,
        hint,
        searchFilter: searchFilterTemplate('feed-filter'),
    });
}

/**
 * @param {SearchFilter} filter
 * @returns {string} Текст кнопки, например «Девушки, 22–28».
 */
function filterLabel(filter: SearchFilter): string {
    return `${SEX_LABELS[filter.sex]}, ${filter.age_from}–${filter.age_to}`;
}

/**
 * @param {DatingGoal | null} key - Цель знакомства из анкеты.
 * @returns {string} Подпись после точки, например «отношения», или пустая строка.
 */
function datingGoalHint(key: DatingGoal | null): string {
    return DATING_GOALS.find((goal) => goal.key === key)?.label.toLowerCase() ?? '';
}

/**
 * Включает кнопку фильтра: открывает панель, сохраняет фильтр на бэкенде
 * и сообщает об этом ленте.
 *
 * @param {HTMLElement} root - Элемент, внутри которого отрисован feedFilterTemplate.
 * @param {Object} params
 * @param {function(SearchFilter): void} params.onApply - Вызывается после сохранения фильтра.
 * @returns {{open: function(): void}} open - Открывает панель снаружи, например из заглушки.
 */
export function initFeedFilter(root: HTMLElement, { onApply }: FeedFilterParams) {
    const filterElement = getElement(root, '.feed__filter');
    const button = getElement<HTMLButtonElement>(filterElement, '.feed__filter-button');
    const label = getElement(button, '.button__text');
    const hint = getElement(button, '.button__hint');
    const form = getElement<HTMLFormElement>(filterElement, '.feed__filter-panel');
    const resetButton = getElement<HTMLButtonElement>(form, '.feed__filter-reset');
    const submitButton = getElement<HTMLButtonElement>(form, '.feed__filter-submit');

    let current: SearchFilter | null = null;
    let isSaving = false;

    function updateValidity() {
        const errors = searchFilterRules(form).map(({ input, validate }) => {
            const error = validate();
            setFormFieldError(input, error);
            return error;
        });

        submitButton.disabled = isSaving || errors.some((error) => error !== null);
    }

    /**
     * Возвращает в поля сохранённый фильтр.
     */
    function fillCurrent() {
        fillSearchFilter(form, current ? fromSearchFilter(current) : {});
        updateValidity();
    }

    /**
     * Клики и Esc в окне ошибки сохранения не должны закрывать панель с введёнными значениями.
     *
     * @param {Event} event
     * @returns {boolean}
     */
    function isInsideModal(event: Event): boolean {
        return event.target instanceof Element && event.target.closest('.modal') !== null;
    }

    function onDocumentClick(event: MouseEvent) {
        if (!filterElement.contains(event.target as Node) && !isInsideModal(event)) {
            close();
        }
    }

    function onDocumentKeydown(event: KeyboardEvent) {
        if (event.key === 'Escape' && !isInsideModal(event)) {
            close();
            button.focus();
        }
    }

    function open() {
        fillCurrent();
        form.hidden = false;
        button.setAttribute('aria-expanded', 'true');
        document.addEventListener('click', onDocumentClick);
        document.addEventListener('keydown', onDocumentKeydown);
    }

    function close() {
        form.hidden = true;
        button.setAttribute('aria-expanded', 'false');
        document.removeEventListener('click', onDocumentClick);
        document.removeEventListener('keydown', onDocumentKeydown);
    }

    button.addEventListener('click', () => {
        if (form.hidden) {
            open();
        } else {
            close();
        }
    });

    form.addEventListener('input', updateValidity);

    resetButton.addEventListener('click', fillCurrent);

    form.addEventListener('submit', async (event) => {
        event.preventDefault();
        if (submitButton.disabled) return;

        const filter = toSearchFilter(readSearchFilter(form));

        isSaving = true;
        updateValidity();

        try {
            current = await setSearchFilter(filter);
        } catch (error) {
            console.error('Не удалось сохранить фильтр:', error);
            if (root.isConnected) showModal(SAVE_ERROR_MODAL);
            return;
        } finally {
            isSaving = false;
            updateValidity();
        }

        if (!root.isConnected) return;

        label.textContent = filterLabel(current);
        close();
        onApply(current);
    });

    Promise.all([getSearchFilter(), getProfile()])
        .then(([filter, profile]) => {
            if (!root.isConnected) return;

            if (current === null) {
                current = filter;
                label.textContent = filterLabel(filter);
            }

            const goal = datingGoalHint(profile.dating_goal);
            hint.textContent = `· ${goal}`;
            hint.hidden = goal === '';
        })
        .catch((error) => {
            console.error('Не удалось загрузить фильтр:', error);
        });

    return { open };
}
