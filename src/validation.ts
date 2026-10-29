const EMAIL_MAX_LENGTH = 254;
const EMAIL_LOCAL_MAX_LENGTH = 64;
const EMAIL_DOMAIN_MIN_LENGTH = 4;

const EMAIL_LOCAL_PATTERN = String.raw`[\p{L}0-9][\p{L}\p{M}0-9'_+&*-]*(?:\.[\p{L}\p{M}0-9'_+&*-]+)*`;
const EMAIL_DOMAIN_SUB_PATTERN = String.raw`[\p{L}0-9](?:[\p{L}\p{M}0-9\-]{0,61}[\p{L}\p{M}0-9])?`;
const EMAIL_DOMAIN_TOP_LETTERS_PATTERN = String.raw`\p{L}[\p{L}\p{M}]{1,62}`;
const EMAIL_DOMAIN_TOP_PUNYCODE_PATTERN = String.raw`xn--[a-zA-Z0-9](?:[a-zA-Z0-9\-]{0,57}[a-zA-Z0-9])?`;
const EMAIL_DOMAIN_TOP_PATTERN = `(?:${EMAIL_DOMAIN_TOP_LETTERS_PATTERN}|${EMAIL_DOMAIN_TOP_PUNYCODE_PATTERN})`;

const EMAIL_PATTERN = new RegExp(
    `^${EMAIL_LOCAL_PATTERN}@(?:${EMAIL_DOMAIN_SUB_PATTERN}\\.)+${EMAIL_DOMAIN_TOP_PATTERN}$`,
    'u',
);

const EMAIL_LATIN_PATTERN = /\p{Script=Latin}/u;
const EMAIL_CYRILLIC_PATTERN = /\p{Script=Cyrillic}/u;

const PASSWORD_MIN_LENGTH = 8;
const PASSWORD_MAX_BYTE_LENGTH = 72;

const NAME_MAX_LENGTH = 64;

const MIN_AGE = 18;

const SEARCH_AGE_MIN = 18;
const SEARCH_AGE_MAX = 100;

const PHOTO_MIN_COUNT = 1;
export const PHOTO_MAX_COUNT = 6;
const PHOTO_MAX_SIZE_MB = 5;

/**
 * Допустимые форматы фото: MIME-тип и название для сообщения об ошибке.
 */
const PHOTO_FORMATS: Record<string, string> = {
    'image/jpeg': 'JPG, JPEG',
    'image/png': 'PNG',
    'image/webp': 'WebP',
};

/**
 * MIME-типы допустимых фото.
 */
export const PHOTO_TYPES = Object.keys(PHOTO_FORMATS);

const PHOTO_FORMAT_NAMES = Object.values(PHOTO_FORMATS);
const PHOTO_FORMATS_LABEL = `${PHOTO_FORMAT_NAMES.slice(0, -1).join(', ')} и ${PHOTO_FORMAT_NAMES.at(-1)}`;

export const INTERESTS_MAX_COUNT = 7;

/**
 * Проверяет, смешаны ли латиница и кириллица в одной части домена.
 *
 * @param domain - Часть почты после "@".
 * @returns `true`, если в одной части смешаны оба алфавита.
 */
function hasMixedScriptLabel(domain: string): boolean {
    return domain
        .split('.')
        .some((label) => EMAIL_LATIN_PATTERN.test(label) && EMAIL_CYRILLIC_PATTERN.test(label));
}

/**
 * Валидирует почту.
 *
 * @remarks Строчными делается вся почта, хотя по RFC стоило бы только домен.
 *
 * @returns Текст ошибки или `null`, если ошибки нет.
 */
export function validateEmail(value: string): string | null {
    const email = value.trim().toLowerCase().normalize('NFC');
    if (email.length === 0) {
        return 'Почта не может быть пустой.';
    }
    if (email.length > EMAIL_MAX_LENGTH) {
        return `Почта не может быть длиннее ${EMAIL_MAX_LENGTH} символов.`;
    }

    const lastAtIdx = email.lastIndexOf('@');
    if (lastAtIdx === -1) {
        return 'Почта должна иметь хотя бы один символ "@".';
    }

    const localPart = email.slice(0, lastAtIdx);
    if (localPart.length === 0) {
        return 'Часть почты до символа "@" не может быть пустой.';
    }
    if (localPart.length > EMAIL_LOCAL_MAX_LENGTH) {
        return `Часть почты до символа "@" не может быть длиннее ${EMAIL_LOCAL_MAX_LENGTH} символов.`;
    }

    const domainPart = email.slice(lastAtIdx + 1);
    if (domainPart.length < EMAIL_DOMAIN_MIN_LENGTH) {
        return `Часть почты после символа "@" не может быть короче ${EMAIL_DOMAIN_MIN_LENGTH} символов.`;
    }

    if (!EMAIL_PATTERN.test(email)) {
        return 'Почта должна быть корректного формата.';
    }

    if (hasMixedScriptLabel(domainPart)) {
        return 'Часть почты после символа "@" не может смешивать русские и английские буквы в одном слове.';
    }

    return null;
}

/**
 * Подсказка о правилах пароля. Правила на буквы и цифры заданы в
 * {@link validatePassword}, при их изменении подсказку нужно обновить.
 */
export const PASSWORD_HINT = `От ${PASSWORD_MIN_LENGTH} символов, хотя бы одна буква и одна цифра.`;

/**
 * Валидирует пароль.
 *
 * @returns Текст ошибки или `null`, если ошибки нет.
 */
export function validatePassword(value: string): string | null {
    const password = value.normalize('NFC');

    if (password.length === 0) {
        return 'Пароль не может быть пустым.';
    }

    if ([...password].length < PASSWORD_MIN_LENGTH) {
        return `Пароль не может быть короче ${PASSWORD_MIN_LENGTH} символов.`;
    }

    const byteLength = new TextEncoder().encode(password).length;
    if (byteLength > PASSWORD_MAX_BYTE_LENGTH) {
        return `Пароль слишком длинный: не больше ${PASSWORD_MAX_BYTE_LENGTH} байт (латиница -- 1 байт на символ, кириллица -- 2, то есть около ${PASSWORD_MAX_BYTE_LENGTH / 2} букв).`;
    }

    if (!/\p{L}/u.test(password)) {
        return 'Пароль должен содержать хотя бы одну букву.';
    }
    if (!/\p{Nd}/u.test(password)) {
        return 'Пароль должен содержать хотя бы одну цифру.';
    }

    return null;
}

/**
 * Проверяет, что повтор пароля введён и совпадает с исходным паролем.
 *
 * @param password - Исходный пароль.
 * @param confirm - Повтор пароля.
 * @returns Текст ошибки или `null`, если ошибки нет.
 */
export function validatePasswordConfirm(password: string, confirm: string): string | null {
    if (confirm.length === 0) {
        return 'Повторите пароль.';
    }

    if (password.normalize('NFC') !== confirm.normalize('NFC')) {
        return 'Пароли не совпадают.';
    }

    return null;
}

/**
 * Убирает лишние пробелы в имени и приводит его к форме NFC.
 *
 * @param value - Введённое имя.
 * @returns Нормализованное имя.
 */
export function normalizeName(value: string): string {
    return value.trim().replace(/\s+/g, ' ').normalize('NFC');
}

/**
 * Валидирует имя после нормализации через {@link normalizeName}.
 *
 * @returns Текст ошибки или `null`, если ошибки нет.
 */
export function validateName(value: string): string | null {
    const name = normalizeName(value);

    if (name.length === 0) {
        return 'Имя не может быть пустым.';
    }

    if ([...name].length > NAME_MAX_LENGTH) {
        return `Имя не может быть длиннее ${NAME_MAX_LENGTH} символов.`;
    }

    const words = name.split(' ');
    for (const word of words) {
        if (!/^[\p{L}\p{M}.'-]+$/u.test(word)) {
            return 'Слова в имени содержат недопустимые символы (разрешены только буквы, дефис, апостроф и точка).';
        }

        if (!/^\p{L}/u.test(word)) {
            return 'Каждое слово в имени должно начинаться с буквы.';
        }

        if (/[.'-]\p{M}/u.test(word)) {
            return 'Диакритический знак в имени должен стоять сразу после буквы.';
        }

        if (!/[\p{L}\p{M}.]$/u.test(word)) {
            return 'Каждое слово в имени должно заканчиваться буквой или точкой.';
        }

        if (/[.'-]{2,}/.test(word)) {
            return 'Два разделителя подряд внутри слова в имени недопустимы.';
        }
    }

    return null;
}

/**
 * Собирает дату из полей формы.
 *
 * @param day - День.
 * @param month - Месяц.
 * @param year - Год.
 * @returns Дата в формате YYYY-MM-DD.
 */
export function toIsoDate(day: string, month: string, year: string): string {
    return [year.trim(), month.padStart(2, '0'), day.trim().padStart(2, '0')].join('-');
}

/**
 * Валидирует дату рождения.
 *
 * @param day - День.
 * @param month - Месяц.
 * @param year - Год.
 * @returns Текст ошибки или `null`, если ошибки нет.
 */
export function validateBirthDate(day: string, month: string, year: string): string | null {
    const dayValue = day.trim();
    const yearValue = year.trim();

    if (dayValue === '' && month === '' && yearValue === '') {
        return 'Укажите дату рождения.';
    }

    if (!/^\d{1,2}$/.test(dayValue) || month === '' || !/^\d{4}$/.test(yearValue)) {
        return 'Заполните день, месяц и год.';
    }

    const [d, m, y] = [Number(dayValue), Number(month), Number(yearValue)];
    const date = new Date(y, m - 1, d);
    const exists = date.getFullYear() === y && date.getMonth() === m - 1 && date.getDate() === d;

    if (!exists) {
        return 'Такой даты не существует.';
    }

    const today = new Date();

    if (date > today) {
        return 'Дата рождения ещё не наступила.';
    }

    const hadBirthday =
        today.getMonth() > m - 1 || (today.getMonth() === m - 1 && today.getDate() >= d);
    const age = today.getFullYear() - y - (hadBirthday ? 0 : 1);

    if (age < MIN_AGE) {
        return `Регистрация доступна только с ${MIN_AGE} лет.`;
    }

    return null;
}

/**
 * Валидирует возрастной диапазон поиска.
 *
 * @param from - Возраст "от".
 * @param to - Возраст "до".
 * @returns Текст ошибки или `null`, если ошибки нет.
 */
export function validateSearchAge(from: string, to: string): string | null {
    const fromValue = from.trim();
    const toValue = to.trim();

    if (!/^\d{1,3}$/.test(fromValue) || !/^\d{1,3}$/.test(toValue)) {
        return `Укажите возраст от ${SEARCH_AGE_MIN} до ${SEARCH_AGE_MAX}.`;
    }

    const [min, max] = [Number(fromValue), Number(toValue)];

    if (
        min < SEARCH_AGE_MIN ||
        max > SEARCH_AGE_MAX ||
        max < SEARCH_AGE_MIN ||
        min > SEARCH_AGE_MAX
    ) {
        return `Возраст должен быть от ${SEARCH_AGE_MIN} до ${SEARCH_AGE_MAX}.`;
    }

    if (max < min) {
        return 'Возраст "от" не может быть больше возраста "до".';
    }

    return null;
}

/**
 * Валидирует файл фото.
 *
 * @param file - Выбранный файл.
 * @returns Текст ошибки или `null`, если ошибки нет.
 */
export function validatePhotoFile(file: File): string | null {
    if (!PHOTO_TYPES.includes(file.type)) {
        return `Подходят только фото в форматах ${PHOTO_FORMATS_LABEL}.`;
    }

    if (file.size > PHOTO_MAX_SIZE_MB * 1024 * 1024) {
        return `Фото не должно быть больше ${PHOTO_MAX_SIZE_MB} МБ.`;
    }

    return null;
}

/**
 * Валидирует количество фото.
 *
 * @param count - Количество фото.
 * @returns Текст ошибки или `null`, если ошибки нет.
 */
export function validatePhotoCount(count: number): string | null {
    if (count < PHOTO_MIN_COUNT) {
        return 'Добавьте хотя бы одно фото.';
    }

    if (count > PHOTO_MAX_COUNT) {
        return `Можно добавить не больше ${PHOTO_MAX_COUNT} фото.`;
    }

    return null;
}

/**
 * Проверяет, что пол выбран.
 *
 * @param value - Выбранное значение, пустая строка - не выбрано.
 * @returns Текст ошибки или `null`, если ошибки нет.
 */
export function validateSex(value: string): string | null {
    return value === '' ? 'Выберите пол.' : null;
}

/**
 * Проверяет, что выбрано, кого показывать.
 *
 * @param value - Выбранное значение, пустая строка - не выбрано.
 * @returns Текст ошибки или `null`, если ошибки нет.
 */
export function validateSearchSex(value: string): string | null {
    return value === '' ? 'Выберите, кого показывать.' : null;
}

/**
 * Проверяет, что цель знакомства выбрана.
 *
 * @param value - Выбранное значение, пустая строка - не выбрано.
 * @returns Текст ошибки или `null`, если ошибки нет.
 */
export function validateDatingGoal(value: string): string | null {
    return value === '' ? 'Выберите цель знакомства.' : null;
}

/**
 * Проверяет, что интересов не больше INTERESTS_MAX_COUNT.
 *
 * @param count - Количество выбранных интересов.
 * @returns Текст ошибки или `null`, если ошибки нет.
 */
export function validateInterestsCount(count: number): string | null {
    if (count > INTERESTS_MAX_COUNT) {
        return `Можно выбрать не больше ${INTERESTS_MAX_COUNT} интересов.`;
    }

    return null;
}
