import type {
    Credentials,
    DatingGoal,
    MissingField,
    Photo,
    ReorderPhotosRequest,
    SearchFilter,
    Sex,
    TagKey,
    TestResult,
    UpdateProfileRequest,
} from './api.types.js';

interface MockResponse {
    status: number;
    body?: unknown;
}

// Тело уже разобрано из JSON или FormData и не проверяется: обработчики приводят его к типу из API.
type MockHandler = (url: URL, request: { body: unknown }) => MockResponse;

type MockRoute = MockResponse | MockHandler;

interface MockProfile {
    user_id: number;
    name: string | null;
    birth_date: string | null;
    sex: Sex | null;
    dating_goal: DatingGoal | null;
    tags: TagKey[];
    photos: Photo[];
    filter: SearchFilter | null;
}

const MOCK_ACCOUNT: Credentials = { email: 'admin@swipes.ru', password: 'password1234' };

const SESSION_COOKIE = 'is_auth';
const ACCESS_COOKIE = 'mock_access';

const hasCookie = (name: string) => document.cookie.split('; ').includes(`${name}=1`);
const setCookie = (name: string) => {
    document.cookie = `${name}=1; path=/`;
};
const removeCookie = (name: string) => {
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

const error = (status: number, code: string, message: string): MockResponse => ({
    status,
    body: { error: { code, message } },
});
const unauthorized = () => error(401, 'UNAUTHORIZED', 'Необходимо войти заново.');

/**
 * Имитирует проверку access-токена: без мок-сессии всё, кроме /auth/*, получает 401.
 *
 * @param {string} pathname
 * @returns {{status: number, body: Object}|null} Ответ-ошибка или null, если доступ есть.
 */
export function checkAccess(pathname: string): MockResponse | null {
    if (pathname.startsWith('/api/v1/auth/') || hasCookie(ACCESS_COOKIE)) {
        return null;
    }

    return unauthorized();
}

const MAX_PHOTOS = 6;
const PROFILE_KEY = 'mock-profile';

const ADMIN_PROFILE: MockProfile = {
    user_id: 1,
    name: 'User',
    birth_date: '2002-05-01',
    sex: 'female',
    dating_goal: 'relationship',
    tags: [],
    photos: [{ id: 1, url: '/public/img/1.jpg' }],
    filter: { sex: 'all', age_from: 18, age_to: 100 },
};

const NEW_PROFILE: MockProfile = {
    user_id: 2,
    name: null,
    birth_date: null,
    sex: null,
    dating_goal: null,
    tags: [],
    photos: [],
    filter: null,
};

const DEFAULT_FILTER: SearchFilter = { sex: 'all', age_from: 18, age_to: 100 };

// Анкета живёт в localStorage, чтобы переживать обновление страницы.
// URL загруженных фото после обновления уже не открываются.
let mockProfile: MockProfile =
    JSON.parse(localStorage.getItem(PROFILE_KEY) ?? 'null') ?? ADMIN_PROFILE;

const saveProfile = (changes: Partial<MockProfile> | UpdateProfileRequest) => {
    mockProfile = { ...mockProfile, ...changes };
    localStorage.setItem(PROFILE_KEY, JSON.stringify(mockProfile));
};

/**
 * @returns {string[]} Незаполненные обязательные поля мок-анкеты.
 */
function missingFields(): MissingField[] {
    const fields: MissingField[] = (['name', 'birth_date', 'sex', 'dating_goal'] as const).filter(
        (field) => mockProfile[field] === null,
    );

    if (!mockProfile.filter) {
        fields.push('search_filter');
    }

    if (mockProfile.photos.length === 0) {
        fields.push('photos');
    }

    return fields;
}

// filter: undefined - фильтр в анкету не входит, JSON его не сохранит.
const profileResponse = () => ({
    status: 200,
    body: { ...mockProfile, filter: undefined, missing: missingFields() },
});

const authResponse = (status: number) => ({
    status,
    body: { user_id: mockProfile.user_id, missing: missingFields() },
});

const photosResponse = (status: number) => ({ status, body: { photos: mockProfile.photos } });

const FEED_ITEMS = [
    {
        user_id: 42,
        name: 'Алина',
        about_me:
            'Работаю в книжном издательстве, по выходным катаюсь на велосипеде вдоль реки. Ищу человека, с которым можно молчать и не скучать.',
        dating_goal: 'relationship',
        compatibility: 0.87,
        education: 'higher',
        alcohol: 'negative',
        smoking: 'negative',
        work: 'Бебра',
        height: 161,
        age: 24,
        city: 'Москва',
        tags: ['книги', 'велосипед', 'кофе', 'музыка', 'походы'],
        photos: [
            { id: 1, url: '/public/img/1.jpg' },
            { id: 2, url: '/public/img/2.jpg' },
            { id: 3, url: '/public/img/3.jpg' },
        ],
    },
    {
        user_id: 43,
        name: 'Марфа',
        about_me: 'Пеку хлеб на закваске и хожу на все концерты, до которых могу доехать.',
        dating_goal: 'relationship',
        compatibility: 0.82,
        age: 25,
        city: 'Санкт-Петербург',
        tags: ['кулинария', 'концерты', 'животные'],
        photos: [{ id: 2, url: '/img/2.jpg' }],
    },
    {
        user_id: 44,
        name: 'Мадина',
        about_me: 'Бегаю по утрам, по вечерам играю в настолки.',
        dating_goal: 'casual',
        compatibility: 0.91,
        age: 26,
        city: 'Казань',
        tags: ['бег', 'настолки'],
        photos: [{ id: 3, url: '/img/3.jpg' }],
    },
    {
        user_id: 45,
        name: 'Алина',
        about_me: 'Фотографирую город и рисую акварелью.',
        dating_goal: 'friendship',
        compatibility: 0.76,
        age: 27,
        city: 'Москва',
        tags: ['фотография', 'рисование', 'путешествия'],
        photos: [{ id: 4, url: '/img/1.jpg' }],
    },
    {
        user_id: 46,
        name: 'Марфа',
        about_me: null,
        dating_goal: 'relationship',
        compatibility: 0.64,
        age: 28,
        city: null,
        tags: ['кино'],
        photos: [{ id: 5, url: '/img/2.jpg' }],
    },
    {
        user_id: 47,
        name: 'Мадина',
        about_me: 'Путешествую при любой возможности.',
        dating_goal: 'casual',
        compatibility: null,
        age: 29,
        city: 'Новосибирск',
        tags: [],
        photos: [{ id: 6, url: '/img/3.jpg' }],
    },
];

const TEST_RESULT: TestResult = {
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

/**
 * Отдаёт страницу мок-ленты по limit и cursor из URL.
 *
 * @param {URL} url
 * @returns {{status: number, body: Object}}
 */
function feedPage(url: URL): MockResponse {
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

const MATCH_NAMES = [
    'Даша',
    'Алина',
    'Соня',
    'Марина',
    'Катя',
    'Александраsdsdsdsdsdsdsdsdsdsdsdsdsdsdsdsdsdsdsdsd',
    'Вера',
    'Лиза',
    'Настя',
    'Полина',
    'Ксюша',
    'Ника',
    'Аня',
    'Оля',
    'Женя',
];

const MATCH_ITEMS = MATCH_NAMES.map((name, index) => ({
    match_id: 100 - index,
    user_id: 200 + index,
    name: index === 7 ? null : name,
    age: index === 9 ? null : 22 + (index % 8),
    photo_url: index % 5 === 3 ? null : `/img/${(index % 3) + 1}.jpg`,
    compatibility: index % 4 === 0 ? null : Math.round((0.95 - index * 0.03) * 100) / 100,
    is_new: index < 3,
    created_at: new Date(Date.UTC(2026, 9, 20 - index, 12)).toISOString(),
}));

const SEEN_MATCHES_KEY = 'mock-seen-matches';

const MATCHES_LIMIT_MAX = 48;

// Просмотренные мэтчи живут в localStorage, чтобы метка «Новая» не возвращалась после обновления.
const loadSeenMatches = (): number[] => JSON.parse(localStorage.getItem(SEEN_MATCHES_KEY) ?? '[]');

const saveSeenMatch = (matchId: number) => {
    const seen = new Set([...loadSeenMatches(), matchId]);
    localStorage.setItem(SEEN_MATCHES_KEY, JSON.stringify([...seen]));
};

/**
 * Отдаёт страницу мок-мэтчей: cursor - match_id последнего мэтча предыдущей страницы.
 *
 * @param {URL} url
 * @returns {{status: number, body: Object}}
 */
function matchesPage(url: URL): MockResponse {
    const limit = Number(url.searchParams.get('limit') ?? 12);
    const cursor = url.searchParams.get('cursor');

    if (!Number.isInteger(limit) || limit < 1 || limit > MATCHES_LIMIT_MAX) {
        return error(400, 'VALIDATION_ERROR', 'Некорректные данные');
    }

    const seen = loadSeenMatches();
    const rest =
        cursor === null
            ? MATCH_ITEMS
            : MATCH_ITEMS.filter((match) => match.match_id < Number(cursor));
    const items = rest
        .slice(0, limit)
        .map((match) => ({ ...match, is_new: match.is_new && !seen.includes(match.match_id) }));
    const hasMore = rest.length > limit;

    return {
        status: 200,
        body: {
            total: MATCH_ITEMS.length,
            items,
            next_cursor: hasMore ? items[items.length - 1].match_id : null,
        },
    };
}

export const MOCK_ROUTES: Record<string, MockRoute> = {
    'GET /api/v1/profile/me/short': () => ({
        status: 200,
        body: {
            user_id: mockProfile.user_id,
            name: mockProfile.name,
            age: mockProfile.birth_date ? 24 : null,
            city: 'Москва',
            photo_url: mockProfile.photos[0]?.url ?? null,
            missing: missingFields(),
        },
    }),
    'GET /api/v1/profile/me': profileResponse,
    'GET /api/v1/feed': feedPage,
    'POST /api/v1/feed/swipe': {
        status: 204,
    },
    'GET /api/v1/matches': matchesPage,
    'POST /api/v1/matches/{id}/seen': (url) => {
        const matchId = Number(url.pathname.split('/').at(-2));

        if (!MATCH_ITEMS.some((match) => match.match_id === matchId)) {
            return error(404, 'MATCH_NOT_FOUND', 'Мэтч не найден');
        }

        saveSeenMatch(matchId);

        return { status: 204 };
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
        const credentials = body as Partial<Credentials> | null;

        if (!credentials?.email || !credentials?.password) {
            return error(400, 'VALIDATION_ERROR', 'Некорректные данные');
        }

        if (credentials.email.trim().toLowerCase() === MOCK_ACCOUNT.email) {
            return error(409, 'EMAIL_ALREADY_EXISTS', 'Почта уже занята');
        }

        startSession();
        saveProfile(NEW_PROFILE);

        return authResponse(201);
    },
    'PATCH /api/v1/profile/me': (url, { body }) => {
        saveProfile(body as UpdateProfileRequest);

        return profileResponse();
    },
    'GET /api/v1/filters/me': () => ({ status: 200, body: mockProfile.filter ?? DEFAULT_FILTER }),
    'PUT /api/v1/filters/me': (url, { body }) => {
        const filter = body as SearchFilter;
        saveProfile({ filter });

        return { status: 200, body: filter };
    },
    'POST /api/v1/profile/me/photos': (url, { body }) => {
        const { photos } = mockProfile;

        if (photos.length >= MAX_PHOTOS) {
            return error(409, 'PHOTO_LIMIT', 'Можно загрузить не больше 6 фотографий');
        }

        const id = Math.max(0, ...photos.map((photo) => photo.id)) + 1;
        const { photo } = body as { photo: File };
        saveProfile({ photos: [...photos, { id, url: URL.createObjectURL(photo) }] });

        return photosResponse(201);
    },
    'DELETE /api/v1/profile/me/photos/{id}': (url) => {
        const id = Number(url.pathname.split('/').pop());
        saveProfile({ photos: mockProfile.photos.filter((photo) => photo.id !== id) });

        return photosResponse(200);
    },
    'PUT /api/v1/profile/me/photos/order': (url, { body }) => {
        const { photos } = mockProfile;
        const ids = (body as ReorderPhotosRequest | null)?.photo_ids ?? [];
        const sameSet =
            ids.length === photos.length && photos.every((photo) => ids.includes(photo.id));

        if (!sameSet) {
            return error(400, 'VALIDATION_ERROR', 'Некорректные данные');
        }

        saveProfile({
            photos: ids
                .map((id) => photos.find((photo) => photo.id === id))
                .filter((photo) => photo !== undefined),
        });

        return photosResponse(200);
    },
    'POST /api/v1/auth/login': (url, { body }) => {
        const { email, password } = body as Credentials;

        if (email !== MOCK_ACCOUNT.email || password !== MOCK_ACCOUNT.password) {
            return error(401, 'INVALID_CREDENTIALS', 'Неверная почта или пароль.');
        }

        startSession();
        saveProfile(ADMIN_PROFILE);

        return authResponse(200);
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
