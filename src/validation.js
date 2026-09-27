const EMAIL_PATTERN = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
const EMAIL_MAX_LENGTH = 254;
const PASSWORD_MIN_LENGTH = 8;
const PASSWORD_MAX_LENGTH = 128;

const EMAIL_ERROR = 'Email должен быть корректным';

export function validateEmail(value) {
    const email = value.trim();

    if (email.length > EMAIL_MAX_LENGTH || !EMAIL_PATTERN.test(email)) {
        return EMAIL_ERROR;
    }

    return null;
}

export function validatePassword(value) {
    if (value.length === 0) {
        return 'Пароль не может быть пустым';
    }

    if (value.length < PASSWORD_MIN_LENGTH) {
        return `Пароль не может быть короче ${PASSWORD_MIN_LENGTH} символов`;
    }

    if (value.length > PASSWORD_MAX_LENGTH) {
        return `Пароль не может быть длиннее ${PASSWORD_MAX_LENGTH} символов`;
    }

    return null;
}
