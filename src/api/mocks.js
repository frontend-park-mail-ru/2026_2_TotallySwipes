const MOCK_ACCOUNT = { email: 'admin@swipes.ru', password: 'password1234' };

const SESSION_COOKIE = 'is_auth';
const ACCESS_COOKIE = 'mock_access';

const hasCookie = (name) => document.cookie.split('; ').includes(`${name}=1`);
const setCookie = (name) => {
    document.cookie = `${name}=1; path=/`;
};
const removeCookie = (name) => {
    document.cookie = `${name}=0; path=/; max-age=0`;
};

const hasSession = () => hasCookie(SESSION_COOKIE);
const startSession = () => {
    setCookie(SESSION_COOKIE);
    setCookie(ACCESS_COOKIE);
};
const endSession = () => {
    removeCookie(SESSION_COOKIE);
    removeCookie(ACCESS_COOKIE);
};

const error = (status, code, message) => ({ status, body: { error: { code, message } } });
const unauthorized = () => error(401, 'UNAUTHORIZED', 'Необходимо войти заново.');

export function checkAccess(pathname) {
    if (pathname.startsWith('/api/v1/auth/') || hasCookie(ACCESS_COOKIE)) {
        return null;
    }

    return unauthorized();
}

const REGISTER_FIELDS = [
    'name',
    'email',
    'password',
    'birth_date',
    'sex',
    'search_sex',
    'dating_intent',
    'search_age_from',
    'search_age_to',
];
const MAX_PHOTOS = 6;

function isRegisterBodyValid(body) {
    if (!body) {
        return false;
    }

    return (
        REGISTER_FIELDS.every((field) => body[field]) &&
        body.photos?.length >= 1 &&
        body.photos?.length <= MAX_PHOTOS
    );
}

const FEED_ITEMS = [
    {
        user_id: 42,
        name: 'Алина',
        about_me:
            'Работаю в книжном издательстве, по выходным катаюсь на велосипеде вдоль реки. Ищу человека, с которым можно молчать и не скучать.',
        dating_intent: 'Ищу половинку',
        compatibility: 0.87,
        age: 24,
        tags: ['книги', 'велосипед', 'кофе', 'музыка', 'походы'],
        photos: [{ id: 1, url: '/public/img/1.jpg' }],
    },
    {
        user_id: 43,
        name: 'Марфа',
        about_me: 'Пеку хлеб на закваске и хожу на все концерты, до которых могу доехать.',
        dating_intent: 'Ищу половинку',
        compatibility: 0.82,
        age: 25,
        tags: ['кулинария', 'концерты', 'животные'],
        photos: [{ id: 2, url: '/public/img/2.jpg' }],
    },
    {
        user_id: 44,
        name: 'Мадина',
        about_me: 'Бегаю по утрам, по вечерам играю в настолки.',
        dating_intent: 'Ищу общение',
        compatibility: 0.91,
        age: 26,
        tags: ['бег', 'настолки'],
        photos: [{ id: 3, url: '/public/img/3.jpg' }],
    },
    {
        user_id: 45,
        name: 'Алина',
        about_me: 'Фотографирую город и рисую акварелью.',
        dating_intent: 'Ищу встречи',
        compatibility: 0.76,
        age: 27,
        tags: ['фотография', 'рисование', 'путешествия'],
        photos: [{ id: 4, url: '/public/img/1.jpg' }],
    },
    {
        user_id: 46,
        name: 'Марфа',
        about_me: null,
        dating_intent: 'Ищу половинку',
        compatibility: 0.64,
        age: 28,
        tags: ['кино'],
        photos: [{ id: 5, url: '/public/img/2.jpg' }],
    },
    {
        user_id: 47,
        name: 'Мадина',
        about_me: 'Путешествую при любой возможности.',
        dating_intent: 'Ищу общение',
        compatibility: null,
        age: 29,
        tags: [],
        photos: [{ id: 6, url: '/public/img/3.jpg' }],
    },
];

const TEST_RESULT = {
    result_id: '1',
    test_id: '1',
    revision: 1,
    completed_at: '2026-10-03T12:00:00Z',
    big_five: {
        openness: 0.85,
        conscientiousness: 0.8,
        extraversion: 0.25,
        agreeableness: 0.55,
        neuroticism: 0.2,
    },
    personality_type: 'STRATEGIST',
    about_personality_type:
        'Стратег: вам ближе новые идеи, продуманный подход и спокойный формат общения.',
};

const TEST_RESULT_KEY = 'mock-test-result';

const hasTestResult = () => localStorage.getItem(TEST_RESULT_KEY) === '1';
const saveTestResult = () => localStorage.setItem(TEST_RESULT_KEY, '1');

function feedPage(url) {
    const limit = Number(url.searchParams.get('limit') ?? 10);
    const cursor = url.searchParams.get('cursor');

    const start =
        cursor === null ? 0 : FEED_ITEMS.findIndex((item) => item.user_id === Number(cursor)) + 1;
    const items = FEED_ITEMS.slice(start, start + limit);
    const hasMore = start + limit < FEED_ITEMS.length;

    return {
        status: 200,
        body: { items, next_cursor: hasMore ? items[items.length - 1].user_id : null },
    };
}

export const MOCK_ROUTES = {
    'GET /api/v1/profile/me/short': {
        status: 200,
        body: { user_id: 1, name: 'User', photo_url: null, age: 24 },
    },
    'GET /api/v1/feed': feedPage,
    'POST /api/v1/feed/swipe': {
        status: 204,
    },
    'GET /api/v1/tests/current': {
        status: 200,
        body: {
            test_id: '1',
            title: 'Психологическая анкета',
            instructions: 'Для каждого утверждения выберите один вариант ответа.',
            answer_options: [
                { value: 1, label: 'совсем не про меня' },
                { value: 2 },
                { value: 3 },
                { value: 4, label: 'отчасти' },
                { value: 5 },
                { value: 6 },
                { value: 7, label: 'точно про меня' },
            ],
            questions: [
                { id: '101', body: 'открытого, полного энтузиазма' },
                { id: '102', body: 'критичного, склонного к спорам' },
                { id: '103', body: 'надёжного, дисциплинированного' },
                { id: '104', body: 'тревожного, легко расстраивающегося' },
                { id: '105', body: 'открытого новому, многогранного' },
                { id: '106', body: 'сдержанного, тихого' },
                { id: '107', body: 'отзывчивого, тёплого' },
                { id: '108', body: 'неорганизованного, беспечного' },
                { id: '109', body: 'спокойного, эмоционально устойчивого' },
                { id: '110', body: 'консервативного, нетворческого' },
            ],
        },
    },
    'POST /api/v1/tests/1/results': () => {
        saveTestResult();

        return { status: 201, body: TEST_RESULT };
    },
    'GET /api/v1/tests/results/me': () => {
        if (!hasTestResult()) {
            return error(404, 'TEST_RESULT_NOT_FOUND', 'Тест ещё не пройден');
        }

        return { status: 200, body: TEST_RESULT };
    },
    'POST /api/v1/auth/register': (url, { body }) => {
        if (!isRegisterBodyValid(body)) {
            return error(400, 'VALIDATION_ERROR', 'Некорректные данные');
        }

        if (body.email.trim().toLowerCase() === MOCK_ACCOUNT.email) {
            return error(409, 'EMAIL_ALREADY_EXISTS', 'Почта уже занята');
        }

        startSession();

        return { status: 201, body: { user_id: 2, profile_completed: false } };
    },
    'POST /api/v1/auth/login': (url, { body }) => {
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
            endSession();
            return unauthorized();
        }

        setCookie(ACCESS_COOKIE);

        return { status: 204 };
    },
};
