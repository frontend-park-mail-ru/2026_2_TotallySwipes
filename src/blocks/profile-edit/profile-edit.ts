import { ApiError, getProfile, updateProfile } from '../../api/api.js';
import type {
    Attitude,
    DatingGoal,
    Education,
    Profile,
    TagKey,
    UpdateProfileRequest,
} from '../../api/api.types.js';
import { ALCOHOL_OPTIONS, DATING_GOALS, EDUCATIONS, SMOKING_OPTIONS } from '../../facts/facts.js';
import { INTERESTS, interestColor, interestIconUrl } from '../../interests.js';
import { asOption, getElement, type TypedForm } from '../../utils/dom.js';
import {
    ABOUT_MAX_LENGTH,
    INTERESTS_MAX_COUNT,
    normalizeName,
    toIsoDate,
    validateAbout,
    validateBirthDate,
    validateHeight,
    validateInterestsCount,
    validateName,
    validateWork,
} from '../../validation.js';
import { chipsTemplate } from '../chips/chips.js';
import {
    formFieldTemplate,
    setFormFieldError,
    validateFormFields,
    type FormFieldRule,
} from '../form-field/form-field.js';
import { showModal } from '../modal/modal.js';
import { profilePhotosTemplate, initProfilePhotos } from '../profile-photos/profile-photos.js';
import { MONTHS } from '../register-profile/register-profile.js';
import { refreshSidebarUser } from '../sidebar/sidebar.js';
import fieldsHbs from './fields.hbs';
import profileEditHbs from './profile-edit.hbs';

type ProfileForm = TypedForm<{
    name: HTMLInputElement;
    day: HTMLInputElement;
    month: HTMLSelectElement;
    year: HTMLInputElement;
    about: HTMLTextAreaElement;
    height: HTMLInputElement;
    education: HTMLSelectElement;
    work: HTMLInputElement;
    datingGoal: RadioNodeList;
    smoking: RadioNodeList;
    alcohol: RadioNodeList;
}>;

/**
 * Поля формы, которые проверяются при вводе.
 */
type FieldKey = 'name' | 'birth' | 'about' | 'height' | 'work';

/**
 * Состояние сохранения: правки не отправлены, идёт отправка, всё сохранено.
 */
type SaveState = 'idle' | 'saving' | 'saved';

/**
 * Значения формы в формате API. По ним определяем, что изменилось.
 */
interface ProfileValues {
    name: string;
    birth_date: string;
    about_me: string | null;
    tags: TagKey[];
    height: number | null;
    education: Education | null;
    work: string | null;
    dating_goal: DatingGoal | null;
    smoking: Attitude | null;
    alcohol: Attitude | null;
}

const SAVE_LABEL = 'Сохранить изменения';
const SAVING_LABEL = 'Сохранение изменений...';

//TODO: вынести в общие константы отсюда, из feed.ts, matches.ts и profile-view.ts
const LOAD_ERROR_MODAL = {
    image: '/icons/mascot-error.svg',
    title: 'Произошла ошибка',
    text: 'Не удалось загрузить профиль, похоже, что пропала связь. Попробуйте ещё раз.',
    buttonText: 'Повторить',
};

const SAVE_ERROR_MODAL = {
    image: '/icons/mascot-error.svg',
    title: 'Произошла ошибка',
    text: 'Данные не отправились — похоже, пропала связь. Они остались на месте, попробуйте снова.',
};

const EDUCATION_KEYS = EDUCATIONS.map(({ key }) => key);
const GOAL_KEYS = DATING_GOALS.map(({ key }) => key);
const ATTITUDE_KEYS = SMOKING_OPTIONS.map(({ key }) => key);
const INTEREST_KEYS = INTERESTS.map(({ key }) => key);

/**
 * Какому проверяемому полю принадлежит поле формы с таким именем?
 */
const FIELD_KEY_BY_NAME: Record<string, FieldKey> = {
    name: 'name',
    day: 'birth',
    month: 'birth',
    year: 'birth',
    about: 'about',
    height: 'height',
    work: 'work',
};

/**
 * Какому проверяемому полю принадлежит поле из ошибки бэкенда?
 */
const FIELD_KEY_BY_API_FIELD: Record<string, FieldKey> = {
    name: 'name',
    birth_date: 'birth',
    about_me: 'about',
    height: 'height',
    work: 'work',
};

/**
 * @param options - Справочник с ключами и подписями.
 * @returns Чипы для группы переключателей.
 */
function toChips(options: { key: string; label: string }[]) {
    return options.map(({ key, label }) => ({ value: key, text: label }));
}

/**
 * @param age - Возраст пользователя.
 * @returns Подсказка под датой рождения.
 */
function ageHint(age: number | null): string {
    return age === null
        ? 'В анкете показываем только возраст'
        : `В анкете показываем только возраст: ${age}`;
}

/**
 * Рендерит карточки с полями анкеты.
 *
 * @param profile - Своя анкета.
 * @returns HTML-строка карточек.
 */
function fieldsTemplate(profile: Profile): string {
    return fieldsHbs({
        name: formFieldTemplate({
            id: 'profile-name',
            name: 'name',
            type: 'text',
            label: 'Имя',
            autocomplete: 'given-name',
        }),
        months: MONTHS,
        ageHint: ageHint(profile.age),
        interests: chipsTemplate({
            type: 'checkbox',
            name: 'interests',
            mix: 'chips_stickers',
            chips: INTERESTS.map(({ key, label }) => ({
                value: key,
                text: label,
                icon: interestIconUrl(key),
                color: interestColor(key),
            })),
        }),
        interestsMax: INTERESTS_MAX_COUNT,
        height: formFieldTemplate({
            id: 'profile-height',
            name: 'height',
            type: 'text',
            inputmode: 'numeric',
            label: 'Рост',
            hint: 'От 100 до 250 см',
            suffix: 'см',
        }),
        educations: EDUCATIONS,
        work: formFieldTemplate({
            id: 'profile-work',
            name: 'work',
            type: 'text',
            label: 'Работа',
            autocomplete: 'organization-title',
        }),
        datingGoal: chipsTemplate({
            type: 'radio',
            name: 'datingGoal',
            chips: toChips(DATING_GOALS),
        }),
        smoking: chipsTemplate({ type: 'radio', name: 'smoking', chips: toChips(SMOKING_OPTIONS) }),
        alcohol: chipsTemplate({ type: 'radio', name: 'alcohol', chips: toChips(ALCOHOL_OPTIONS) }),
    });
}

/**
 * @param form - Форма страницы.
 * @returns Чекбоксы интересов.
 */
function interestBoxes(form: ProfileForm): HTMLInputElement[] {
    return [...form.querySelectorAll<HTMLInputElement>('input[name="interests"]')];
}

/**
 * Заполняет поля формы значениями анкеты.
 *
 * @param form - Форма страницы.
 * @param profile - Своя анкета.
 */
function fillForm(form: ProfileForm, profile: Profile) {
    const { name, day, month, year, about, height, education, work } = form.elements;
    const [birthYear = '', birthMonth = '', birthDay = ''] = profile.birth_date?.split('-') ?? [];

    name.value = profile.name ?? '';
    day.value = birthDay && String(Number(birthDay));
    month.value = birthMonth && String(Number(birthMonth));
    year.value = birthYear;
    about.value = profile.about_me ?? '';
    height.value = profile.height === null ? '' : String(profile.height);
    education.value = profile.education ?? '';
    work.value = profile.work ?? '';
    form.elements.datingGoal.value = profile.dating_goal ?? '';
    form.elements.smoking.value = profile.smoking ?? '';
    form.elements.alcohol.value = profile.alcohol ?? '';

    const tags: readonly string[] = profile.tags;
    interestBoxes(form).forEach((box) => {
        box.checked = tags.includes(box.value);
    });
}

/**
 * Читает значения формы. Вызывается, когда все поля уже проверены.
 *
 * @param form - Форма страницы.
 * @returns Значения в формате API.
 */
function readValues(form: ProfileForm): ProfileValues {
    const { name, day, month, year, about, height, education, work } = form.elements;
    const textOrNull = (value: string) => value.trim() || null;

    return {
        name: normalizeName(name.value),
        birth_date: toIsoDate(day.value, month.value, year.value),
        about_me: textOrNull(about.value),
        tags: interestBoxes(form)
            .filter((box) => box.checked)
            .map((box) => asOption(INTEREST_KEYS, box.value))
            .filter((key) => key !== undefined),
        height: height.value.trim() === '' ? null : Number(height.value),
        education: asOption(EDUCATION_KEYS, education.value) ?? null,
        work: textOrNull(work.value),
        dating_goal: asOption(GOAL_KEYS, form.elements.datingGoal.value) ?? null,
        smoking: asOption(ATTITUDE_KEYS, form.elements.smoking.value) ?? null,
        alcohol: asOption(ATTITUDE_KEYS, form.elements.alcohol.value) ?? null,
    };
}

/**
 * @param profile - Анкета из ответа API.
 * @returns Значения в том же виде, что и у {@link readValues}.
 */
function profileToValues(profile: Profile): ProfileValues {
    return {
        name: profile.name ?? '',
        birth_date: profile.birth_date ?? '',
        about_me: profile.about_me,
        tags: profile.tags,
        height: profile.height,
        education: profile.education,
        work: profile.work,
        dating_goal: profile.dating_goal,
        smoking: profile.smoking,
        alcohol: profile.alcohol,
    };
}

/**
 * Находит поля, которые пользователь изменил.
 *
 * @param saved - Значения, которые уже сохранены на бэкенде.
 * @param current - Значения в форме.
 * @returns Тело запроса только с изменёнными полями. Пустое, если менять нечего.
 */
function changedFields(saved: ProfileValues, current: ProfileValues): UpdateProfileRequest {
    const changes: UpdateProfileRequest = {};
    const sameTags =
        saved.tags.length === current.tags.length &&
        saved.tags.every((tag) => current.tags.includes(tag));

    if (current.name !== saved.name) changes.name = current.name;
    if (current.birth_date !== saved.birth_date) changes.birth_date = current.birth_date;
    if (current.about_me !== saved.about_me) changes.about_me = current.about_me;
    if (!sameTags) changes.tags = current.tags;
    if (current.height !== saved.height) changes.height = current.height;
    if (current.education !== saved.education) changes.education = current.education;
    if (current.work !== saved.work) changes.work = current.work;
    if (current.dating_goal && current.dating_goal !== saved.dating_goal) {
        changes.dating_goal = current.dating_goal;
    }
    if (current.smoking !== saved.smoking) changes.smoking = current.smoking;
    if (current.alcohol !== saved.alcohol) changes.alcohol = current.alcohol;

    return changes;
}

/**
 * @param form - Форма страницы.
 * @returns Правила проверки полей, которые проверяются при вводе.
 */
function buildRules(form: ProfileForm): Record<FieldKey, FormFieldRule> {
    const { name, day, month, year, about, height, work } = form.elements;

    return {
        name: { input: name, validate: validateName },
        birth: {
            input: day,
            validate: () => validateBirthDate(day.value, month.value, year.value),
        },
        about: { input: about, validate: validateAbout },
        height: { input: height, validate: validateHeight },
        work: { input: work, validate: validateWork },
    };
}

/**
 * Рендерит страницу редактирования своей анкеты. Правки отправляются одним запросом
 * по кнопке, уходят только изменённые поля. Если анкету не удалось загрузить,
 * предлагает повторить.
 *
 * @param root - Контейнер страницы.
 */
export function renderProfileEditPage(root: HTMLElement) {
    root.innerHTML = profileEditHbs();

    const page = getElement<ProfileForm>(root, '.profile-edit');
    const content = getElement(page, '.profile-edit__content');
    const saveButton = getElement<HTMLButtonElement>(page, '.profile-edit__save');
    const saveLabel = getElement(saveButton, '.button__text');
    const savedMessage = getElement(page, '.profile-edit__saved');

    let rules: Record<FieldKey, FormFieldRule>;
    let saved: ProfileValues;
    let saveState: SaveState = 'idle';
    let isLoaded = false;

    load();

    function load() {
        getProfile()
            .then((profile) => {
                if (!page.isConnected) return;

                content.innerHTML = profilePhotosTemplate() + fieldsTemplate(profile);
                initProfilePhotos(getElement(content, '.profile-photos'), {
                    photos: profile.photos,
                    onSettled: refreshSidebarUser,
                });
                fillForm(page, profile);

                saved = profileToValues(profile);
                rules = buildRules(page);
                isLoaded = true;

                updateAboutCounter();
                updateInterestsCounter();
                setSaveState('idle');

                page.addEventListener('input', onFieldEvent);
                page.addEventListener('change', onFieldEvent);
                page.addEventListener('submit', (event) => {
                    event.preventDefault();
                    save();
                });
            })
            .catch((error) => {
                console.error('Не удалось загрузить профиль:', error);
                if (!page.isConnected) return;

                showModal({ ...LOAD_ERROR_MODAL, onClose: load });
            });
    }

    /**
     * Событие изменения поля. Сбрасывает "сохранено" и проверяет поле.
     *
     * @param event - Событие input или change.
     */
    function onFieldEvent(event: Event) {
        const target = event.target;

        if (!(
            target instanceof HTMLInputElement ||
            target instanceof HTMLSelectElement ||
            target instanceof HTMLTextAreaElement
        )) {
            return;
        }

        // Фото сохраняются сразу, а не вместе с остальными полями.
        if (target.closest('.profile-photos')) {
            return;
        }

        const isTextField =
            target instanceof HTMLTextAreaElement ||
            (target instanceof HTMLInputElement && target.type === 'text');

        // У текстовых полей значение меняет input, у остальных - change.
        if ((event.type === 'input') === isTextField && saveState === 'saved') {
            setSaveState('idle');
        }

        if (target.name === 'about' && event.type === 'input') {
            updateAboutCounter();
        }

        if (target.name === 'interests') {
            if (event.type === 'change' && target instanceof HTMLInputElement) {
                onInterestChange(target);
            }
        } else {
            const rule = rules[FIELD_KEY_BY_NAME[target.name]];

            if (rule && (event.type === 'change' || isInvalid(rule))) {
                setFormFieldError(rule.input, rule.validate(rule.input.value));
            }
        }

        refreshSaveButton();
    }

    /**
     * Не даёт выбрать больше интересов, чем разрешено.
     *
     * @param checkbox - Переключённый чекбокс.
     */
    function onInterestChange(checkbox: HTMLInputElement) {
        const boxes = interestBoxes(page);
        const error = validateInterestsCount(boxes.filter((box) => box.checked).length);

        if (error) {
            checkbox.checked = false;
        }

        setFormFieldError(boxes[0], error);
        updateInterestsCounter();
    }

    function updateAboutCounter() {
        getElement(page, '.profile-edit__counter').textContent =
            `${[...page.elements.about.value].length} / ${ABOUT_MAX_LENGTH}`;
    }

    function updateInterestsCounter() {
        const count = interestBoxes(page).filter((box) => box.checked).length;

        getElement(page, '.profile-edit__interests-count').textContent =
            `${count} из ${INTERESTS_MAX_COUNT}`;
    }

    /**
     * @param rule - Правило проверки поля.
     * @returns Показана ли сейчас у поля ошибка.
     */
    function isInvalid(rule: FormFieldRule): boolean {
        return Boolean(rule.input.closest('.form-field')?.classList.contains('form-field_invalid'));
    }

    /**
     * Переключает вид шапки: кнопка, кнопка с отправкой или "Все изменения сохранены".
     *
     * @param state - Новое состояние сохранения.
     */
    function setSaveState(state: SaveState) {
        saveState = state;
        saveLabel.textContent = state === 'saving' ? SAVING_LABEL : SAVE_LABEL;
        saveButton.hidden = state === 'saved';
        savedMessage.hidden = state !== 'saved';

        refreshSaveButton();
    }

    /**
     * Кнопка недоступна, пока идёт отправка или у какого-то поля показана ошибка.
     */
    function refreshSaveButton() {
        saveButton.disabled =
            !isLoaded || saveState === 'saving' || Object.values(rules).some(isInvalid);
    }

    async function save() {
        if (saveState === 'saving') return;

        if (!validateFormFields(Object.values(rules))) {
            refreshSaveButton();
            return;
        }

        const changes = changedFields(saved, readValues(page));

        if (Object.keys(changes).length === 0) {
            setSaveState('saved');
            return;
        }

        setSaveState('saving');

        try {
            const profile = await updateProfile(changes);
            if (!page.isConnected) return;

            saved = profileToValues(profile);
            getElement(page, '.profile-edit__age-hint').textContent = ageHint(profile.age);
            setSaveState('saved');
            refreshSidebarUser();
        } catch (error) {
            console.error('Не удалось сохранить профиль:', error);
            if (!page.isConnected) return;

            setSaveState('idle');

            if (!showFieldErrors(error)) {
                showModal(
                    error instanceof ApiError && error.status < 500
                        ? { ...SAVE_ERROR_MODAL, text: error.message }
                        : SAVE_ERROR_MODAL,
                );
            }
        }
    }

    /**
     * Показывает ошибки, которые бэкенд вернул по отдельным полям.
     *
     * @param error - Ошибка отправки.
     * @returns Показана ли хотя бы одна ошибка у поля.
     */
    function showFieldErrors(error: unknown): boolean {
        if (!(error instanceof ApiError) || !error.fields) {
            return false;
        }

        let isShown = false;

        for (const [apiField, message] of Object.entries(error.fields)) {
            const key = FIELD_KEY_BY_API_FIELD[apiField];

            if (key) {
                setFormFieldError(
                    rules[key].input,
                    message.charAt(0).toUpperCase() + message.slice(1),
                );
                isShown = true;
            }
        }

        refreshSaveButton();

        return isShown;
    }
}
