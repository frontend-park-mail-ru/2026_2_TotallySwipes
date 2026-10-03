// Проверки почты
const EMAIL_MIN_LENGTH = 6;
const EMAIL_MAX_LENGTH = 254;
const EMAIL_PATTERN = /^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

// Проверки пароля
const PASSWORD_MIN_LENGTH = 8;
const PASSWORD_MAX_LENGTH = 128;

// Проверки имени
const NAME_MAX_LENGTH = 100;

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

export function validateEmail(value) {
    const email = value.trim();

    if (email.length < EMAIL_MIN_LENGTH) {
        return `Почта не может быть короче ${EMAIL_MIN_LENGTH} символов.`;
    }

    if (email.length > EMAIL_MAX_LENGTH) {
        return `Почта не может быть длиннее ${EMAIL_MAX_LENGTH} символов.`;
    }

    if (!EMAIL_PATTERN.test(email)) {
        return 'Почта должна быть корректного формата.';
    }

    return null;
}

export function validatePassword(value) {
    const password = value;

    if (password.length === 0) {
        return 'Пароль не может быть пустым.';
    }

    if (password.length < PASSWORD_MIN_LENGTH) {
        return `Пароль не может быть короче ${PASSWORD_MIN_LENGTH} символов.`;
    }

    if (password.length > PASSWORD_MAX_LENGTH) {
        return `Пароль не может быть длиннее ${PASSWORD_MAX_LENGTH} символов.`;
    }

    return null;
}

export function validateName(value) {
    const name = value.trim();

    if (name.length === 0) {
        return 'Имя не может быть пустым.';
    }

    if (name.length > NAME_MAX_LENGTH) {
        return `Имя не может быть длиннее ${NAME_MAX_LENGTH} символов.`;
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
        return `Укажите возраст от ${MIN_AGE} до ${SEARCH_AGE_MAX}.`;
    }

    const [min, max] = [Number(fromValue), Number(toValue)];

    if (min < MIN_AGE || max > SEARCH_AGE_MAX || max < MIN_AGE || min > SEARCH_AGE_MAX) {
        return `Возраст должен быть от ${MIN_AGE} до ${SEARCH_AGE_MAX}.`;
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

export function validateAgreement(isChecked) {
    return isChecked ? null : 'Подтвердите, что вам есть 18 лет и вы принимаете правила.';
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
