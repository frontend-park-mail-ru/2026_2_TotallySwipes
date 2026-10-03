const MOCK_ACCOUNT = { email: 'admin@swipes.ru', password: 'password1234' };

const SESSION_COOKIE = 'is_auth';

const hasSession = () => document.cookie.split('; ').includes(`${SESSION_COOKIE}=1`);
const startSession = () => { document.cookie = `${SESSION_COOKIE}=1; path=/`; };
const endSession = () => { document.cookie = `${SESSION_COOKIE}=0; path=/; max-age=0`; };

const error = (status, code, message) => ({ status, body: { error: { code, message } } });
const unauthorized = () => error(401, 'UNAUTHORIZED', 'Необходимо войти заново.');

const REGISTER_FIELDS = [
    'name',
    'email',
    'password',
    'birth_date',
    'sex',
    'search_sex',
    'dating_intent',
    'search_age_from',
    'search_age_to'
];
const MAX_PHOTOS = 6;

function isRegisterBodyValid(body) {
    if (!body) return false; 

    return REGISTER_FIELDS.every((field) => body[field])
        && (body.photos?.length >= 1)
        && (body.photos?.length <= MAX_PHOTOS);
}

export const MOCK_ROUTES = {
    'POST /api/v1/auth/register': ({ body }) => {
        if (!isRegisterBodyValid(body)) {
            return error(400, 'VALIDATION_ERROR', 'Некорректные данные');
        }

        if (body.email.trim().toLowerCase() === MOCK_ACCOUNT.email) {
            return error(409, 'EMAIL_ALREADY_EXISTS', 'Почта уже занята');
        }

        startSession();

        return { status: 201, body: { user_id: 2, profile_completed: false } };
    },

    'POST /api/v1/auth/login': ({ body }) => {
        if (body.email !== MOCK_ACCOUNT.email || body.password !== MOCK_ACCOUNT.password) {
            return error(401, 'INVALID_CREDENTIALS', 'Неверная почта или пароль.');
        }

        startSession();

        return { status: 200, body: { user_id: 1, profile_completed: true } };
    },

    'POST /api/v1/auth/logout': () => {
        endSession();

        return { status: 204 };
    },

    'POST /api/v1/auth/refresh': () => {
        if (!hasSession()) {
            return unauthorized();
        }

        return { status: 204 };
    },

    'GET /api/v1/user/me': () => {
        if (!hasSession()) {
            return unauthorized();
        }

        return {
            status: 200,
            body: { id: 1, name: 'User', age: 25, city: 'Москва', avatar: null },
        };
    },
};
