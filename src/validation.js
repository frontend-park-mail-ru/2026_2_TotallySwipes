// Проверки почты
const EMAIL_MIN_LENGTH = 6;
const EMAIL_MAX_LENGTH = 254;
const EMAIL_PATTERN = /^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

// Проверки пароля
const PASSWORD_MIN_LENGTH = 8;
const PASSWORD_MAX_LENGTH = 128;

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
