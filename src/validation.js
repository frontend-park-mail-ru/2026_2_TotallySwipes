// Проверки почты
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

// Проверки пароля
const PASSWORD_MIN_LENGTH = 8;
const PASSWORD_MAX_BYTE_LENGTH = 72;

// Проверки имени
const NAME_MAX_LENGTH = 64;

// Проверки даты рождения
const MIN_AGE = 18;

// Проверки возраста для поиска анкет
const SEARCH_AGE_MIN = 18;
const SEARCH_AGE_MAX = 100;

// Проверки фото
const PHOTO_MIN_COUNT = 1;
export const PHOTO_MAX_COUNT = 6;
const PHOTO_MAX_SIZE_MB = 5;
export const PHOTO_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

// Проверки интересов
export const INTERESTS_MAX_COUNT = 7;

function hasMixedScriptLabel(domain) {
    return domain
        .split('.')
        .some((label) => EMAIL_LATIN_PATTERN.test(label) && EMAIL_CYRILLIC_PATTERN.test(label));
}

export function validateEmail(value) {
    // По-хорошему, .toLowerCase() только у доменной части, так как
    // при применении .toLowerCase() к локальной части получаем проблемы от самого toLowerCase()
    // и нарушаем RFC.

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

export const PASSWORD_HINT = `От ${PASSWORD_MIN_LENGTH} символов, хотя бы одна буква и одна цифра.`;

export function validatePassword(value) {
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

export function validatePasswordConfirm(password, confirm) {
    if (confirm.length === 0) {
        return 'Повторите пароль.';
    }

    if (password.normalize('NFC') !== confirm.normalize('NFC')) {
        return 'Пароли не совпадают.';
    }

    return null;
}

export function normalizeName(value) {
    return value.trim().replace(/\s+/g, ' ').normalize('NFC');
}

export function validateName(value) {
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

export function toIsoDate(day, month, year) {
    return [year.trim(), month.padStart(2, '0'), day.trim().padStart(2, '0')].join('-');
}

export function validateBirthDate(day, month, year) {
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

    const hadBirthday = today.getMonth() > m - 1 || (today.getMonth() === m - 1 && today.getDate() >= d);
    const age = today.getFullYear() - y - (hadBirthday ? 0 : 1);

    if (age < MIN_AGE) {
        return `Регистрация доступна только с ${MIN_AGE} лет.`;
    }

    return null;
}

export function validateSearchAge(from, to) {
    const fromValue = from.trim();
    const toValue = to.trim();

    if (!/^\d{1,3}$/.test(fromValue) || !/^\d{1,3}$/.test(toValue)) {
        return `Укажите возраст от ${SEARCH_AGE_MIN} до ${SEARCH_AGE_MAX}.`;
    }

    const [min, max] = [Number(fromValue), Number(toValue)];

    if (min < SEARCH_AGE_MIN || max > SEARCH_AGE_MAX || max < SEARCH_AGE_MIN || min > SEARCH_AGE_MAX) {
        return `Возраст должен быть от ${SEARCH_AGE_MIN} до ${SEARCH_AGE_MAX}.`;
    }

    if (max < min) {
        return 'Возраст "от" должен быть меньше возраста "до".';
    }

    return null;
}

export function validatePhotoFile(file) {
    if (!PHOTO_TYPES.includes(file.type)) {
        return 'Подходят только фото в форматах JPG, JPEG, PNG и WebP.';
    }

    if (file.size > PHOTO_MAX_SIZE_MB * 1024 * 1024) {
        return `Фото не должно быть больше ${PHOTO_MAX_SIZE_MB} МБ.`;
    }

    return null;
}

export function validatePhotoCount(count) {
    if (count < PHOTO_MIN_COUNT) {
        return 'Добавьте хотя бы одно фото.';
    }

    if (count > PHOTO_MAX_COUNT) {
        return `Можно добавить не больше ${PHOTO_MAX_COUNT} фото.`;
    }

    return null;
}

export function validateSex(value) {
    return value === '' ? 'Выберите пол.' : null;
}

export function validateSearchSex(value) {
    return value === '' ? 'Выберите, кого показывать.' : null;
}

export function validateDatingIntent(value) {
    return value === '' ? 'Выберите цель знакомства.' : null;
}

export function validateInterestsCount(count) {
    if (count > INTERESTS_MAX_COUNT) {
        return `Можно выбрать не больше ${INTERESTS_MAX_COUNT} интересов.`;
    }

    return null;
}
