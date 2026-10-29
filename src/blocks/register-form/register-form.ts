import { stepsTemplate } from '../steps/steps.js';
import { accountStep } from '../register-account/register-account.js';
import { profileStep } from '../register-profile/register-profile.js';
import { searchStep } from '../register-search/register-search.js';
import { photosStep } from '../register-photos/register-photos.js';
import { interestsStep } from '../register-interests/register-interests.js';
import { showModal } from '../modal/modal.js';
import { ApiError, getProfile, getSearchFilter } from '../../api/api.js';
import type {
    DatingGoal,
    MissingField,
    Photo,
    Profile,
    SearchFilter,
    SearchSex,
    Sex,
    TagKey,
} from '../../api/api.types.js';
import { getElement } from '../../utils/dom.js';
import { icons } from '../../icons.js';
import registerFormHbs from './register-form.hbs';

const NEXT_LABEL = 'Продолжить';
const FINISH_LABEL = 'Готово — к тесту';
const GENERIC_ERROR_MESSAGE =
    'Не удалось сохранить данные. Проверьте соединение и попробуйте ещё раз.';
const LOAD_ERROR_MODAL = {
    image: '/icons/mascot-error.svg',
    title: 'Произошла ошибка',
    text: 'Похоже, что пропала связь. Попробуйте ещё раз.',
    buttonText: 'Повторить',
};

/**
 * Выбирает текст ошибки шага: сообщение бэкенда с причинами по полям
 * для ошибок 4xx, иначе общее.
 *
 * @param error - Ошибка отправки шага.
 * @returns Текст ошибки для пользователя.
 */
function registerErrorMessage(error: unknown): string {
    if (error instanceof ApiError && error.status < 500) {
        const reasons = Object.values(error.fields ?? {});

        return reasons.length > 0 ? `${error.message}: ${reasons.join('; ')}` : error.message;
    }

    return GENERIC_ERROR_MESSAGE;
}

/**
 * Введённые данные шагов. Живут, пока открыта страница.
 */
export interface RegisterData {
    /** Аккаунт уже создан. */
    registered?: boolean;
    email?: string;
    password?: string;
    name?: string;
    birthDay?: string;
    birthMonth?: string;
    birthYear?: string;
    /** Дата в формате YYYY-MM-DD. */
    birthDate?: string;
    sex?: Sex;
    searchSex?: SearchSex;
    searchAgeFrom?: string;
    searchAgeTo?: string;
    datingGoal?: DatingGoal;
    /** Актуальный список фото с бэкенда, первое -- главное. */
    photos?: Photo[];
    /** Очередь действий с фото. */
    photosPending?: Promise<void>;
    /** Сколько действий с фото ещё не завершилось. */
    photosSaving?: number;
    /** Ключи тегов бэкенда. */
    interests?: TagKey[];
}

/**
 * Логика шага. Поля формы шаги типизируют сами, поэтому методы объявлены
 * в виде методов, а не свойств-функций.
 */
export interface RegisterStepLogic {
    /** HTML-строка тела шага. */
    template?(data: RegisterData): string;
    /** Заполняет поля из data. */
    init?(form: HTMLFormElement, data: RegisterData): void;
    /** Запоминает введённое без проверки, когда пользователь возвращается на шаг назад. */
    save?(form: HTMLFormElement, data: RegisterData): void;
    /**
     * При успехе сама сохраняет введённые значения в data и возвращает true.
     * Может быть async.
     */
    validate?(form: HTMLFormElement, data: RegisterData): boolean | Promise<boolean>;
    /**
     * Отправляет данные шага на бэкенд после validate. false - остаться на шаге
     * (ошибку шаг показал сам), исключение - показать общую ошибку формы.
     */
    submit?(form: HTMLFormElement, data: RegisterData): Promise<boolean>;
}

/**
 * Логика шага, у которого есть `save`: ей пользуется сам шаг в `validate`.
 */
export interface RegisterStepLogicWithSave extends RegisterStepLogic {
    save(form: HTMLFormElement, data: RegisterData): void;
}

/**
 * Свойства формы регистрации для инициализации.
 */
export interface RegisterFormProps {
    /**
     * Аккаунт уже создан: подтянуть анкету с бэкенда и начать с первого шага,
     * где не хватает данных.
     */
    resume?: boolean;
    /** Вызывается после успешной регистрации. */
    onRegister?: () => void;
}

/**
 * Шаг регистрации: тексты над формой и логика шага.
 */
export interface RegisterStep extends RegisterStepLogic {
    title: string;
    subtitle: string;
    /** Поля из missing бэкенда, которые заполняет шаг. */
    fields?: MissingField[];
}

const STEPS: RegisterStep[] = [
    {
        title: 'Создайте аккаунт!',
        subtitle: 'Займёт пару минут. Анкету можно поменять потом.',
        ...accountStep,
    },
    {
        title: 'Расскажите о себе!',
        subtitle: 'Имя и возраст увидят в вашей анкете.',
        fields: ['name', 'birth_date', 'sex'],
        ...profileStep,
    },
    {
        title: 'Кого вы ищете?',
        subtitle: 'Поменять можно в любой момент в фильтрах.',
        fields: ['dating_goal', 'search_filter'],
        ...searchStep,
    },
    {
        title: 'Добавьте фото!',
        subtitle:
            'Хотя бы одно, где хорошо видно лицо. Первое станет главным — порядок меняется перетаскиванием.',
        fields: ['photos'],
        ...photosStep,
    },
    {
        title: 'Что вам интересно?',
        subtitle: 'Выберите до 7 интересов — по ним проще начать разговор.',
        ...interestsStep,
    },
];

/**
 * Переводит сохранённые на бэкенде анкету и фильтр в data шагов.
 *
 * @param profile - Анкета, сохранённая на бэкенде.
 * @param filter - Фильтр поиска, сохранённый на бэкенде.
 * @returns data для шагов, поля без значения - undefined.
 */
function profileToData(profile: Profile, filter: SearchFilter): RegisterData {
    const [birthYear, birthMonth, birthDay] = profile.birth_date?.split('-') ?? [];
    // Пока фильтр не задан, бэкенд отдаёт значения по умолчанию, а не выбор пользователя.
    const hasFilter = !profile.missing.includes('search_filter');

    return {
        registered: true,
        name: profile.name ?? undefined,
        birthDay: birthDay && String(Number(birthDay)),
        birthMonth: birthMonth && String(Number(birthMonth)),
        birthYear,
        sex: profile.sex ?? undefined,
        datingGoal: profile.dating_goal ?? undefined,
        searchSex: hasFilter ? filter.sex : undefined,
        searchAgeFrom: hasFilter ? String(filter.age_from) : undefined,
        searchAgeTo: hasFilter ? String(filter.age_to) : undefined,
        photos: profile.photos,
        interests: profile.tags,
    };
}

/**
 * Рендерит контейнер формы. Шаги рендерит initRegisterForm.
 *
 * @returns HTML-строка контейнера формы.
 */
export function registerFormTemplate() {
    return '<div class="register-form"></div>';
}

/**
 * Запускает пошаговую регистрацию. Введённые данные живут, пока открыта страница.
 *
 * @param root - Контейнер формы регистрации.
 * @param props - Свойства формы регистрации.
 */
export function initRegisterForm(root: HTMLElement, props: RegisterFormProps = {}) {
    const data: RegisterData = {};
    let isSubmitting = false;

    /**
     * Блокирует или разблокирует кнопки действий формы.
     *
     * @param form - Форма шага.
     * @param disabled - Заблокировать кнопки.
     */
    function setActionsDisabled(form: HTMLFormElement, disabled: boolean) {
        form.querySelectorAll<HTMLButtonElement>('.register-form__actions .button').forEach(
            (button) => {
                button.disabled = disabled;
            },
        );
    }

    /**
     * Проверяет и отправляет текущий шаг.
     *
     * @param step - Текущий шаг.
     * @param form - Форма шага.
     * @returns Можно ли идти дальше.
     */
    async function completeStep(step: RegisterStep, form: HTMLFormElement): Promise<boolean> {
        const formError = getElement(form, '.register-form__error');
        formError.hidden = true;

        try {
            const isValid = (await step.validate?.(form, data)) ?? true;

            return isValid && ((await step.submit?.(form, data)) ?? true);
        } catch (error) {
            formError.textContent = registerErrorMessage(error);
            formError.hidden = false;

            return false;
        }
    }

    /**
     * Рисует шаг и вешает обработчики формы.
     * После создания аккаунта на шаг с почтой вернуться нельзя.
     *
     * @param index - Индекс шага в STEPS.
     */
    function showStep(index: number) {
        const step = STEPS[index];
        const isLast = index === STEPS.length - 1;

        root.innerHTML = registerFormHbs({
            progress: stepsTemplate({
                items: STEPS.map((_, stepIndex) => ({
                    number: stepIndex + 1,
                    color: 'primary',
                    state: stepIndex < index ? 'done' : stepIndex === index ? 'current' : 'todo',
                })),
                isInteractive: false,
            }),
            title: step.title,
            subtitle: step.subtitle,
            body: step.template?.(data) ?? '',
            hasBack: index > (data.registered ? 1 : 0),
            isFirst: index === 0,
            nextLabel: isLast ? FINISH_LABEL : NEXT_LABEL,
            arrow: icons.arrow,
        });

        const form = getElement<HTMLFormElement>(root, '.register-form__form');
        step.init?.(form, data);

        form.addEventListener('submit', async (event) => {
            event.preventDefault();

            if (isSubmitting) {
                return;
            }

            isSubmitting = true;
            setActionsDisabled(form, true);

            const isDone = await completeStep(step, form);

            isSubmitting = false;

            if (!isDone) {
                setActionsDisabled(form, false);
                return;
            }

            if (isLast) {
                props.onRegister?.();
                return;
            }

            showStep(index + 1);
        });

        form.addEventListener('input', () => {
            getElement(form, '.register-form__error').hidden = true;
        });

        form.querySelector('.register-form__back')?.addEventListener('click', () => {
            if (isSubmitting) {
                return;
            }

            step.save?.(form, data);
            showStep(index - 1);
        });
    }

    /**
     * Продолжает регистрацию уже созданного аккаунта, например после обновления страницы.
     */
    async function resumeRegistration() {
        let profile;
        let filter;

        try {
            [profile, filter] = await Promise.all([getProfile(), getSearchFilter()]);
        } catch (error) {
            console.error('Не удалось загрузить анкету:', error);

            if (root.isConnected) {
                showModal({ ...LOAD_ERROR_MODAL, onClose: resumeRegistration });
            }
            return;
        }

        if (!root.isConnected) {
            return;
        }

        if (profile.missing.length === 0) {
            props.onRegister?.();
            return;
        }

        Object.assign(data, profileToData(profile, filter));

        const index = STEPS.findIndex((step) =>
            step.fields?.some((field) => profile.missing.includes(field)),
        );
        // Незнакомое поле в missing: начинаем с первого шага анкеты.
        showStep(index === -1 ? 1 : index);
    }

    if (props.resume) {
        resumeRegistration();
    } else {
        showStep(0);
    }
}
