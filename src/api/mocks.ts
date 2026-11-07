import type {
    Attitude,
    Credentials,
    DatingGoal,
    Coordinates,
    Education,
    MatchedProfile,
    MissingField,
    Photo,
    ReorderPhotosRequest,
    SearchFilter,
    Sex,
    TagKey,
    TestResult,
    UpdateProfileRequest,
    UserLocation,
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
    about_me: string | null;
    education: Education | null;
    work: string | null;
    smoking: Attitude | null;
    alcohol: Attitude | null;
    height: number | null;
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

// Необязательные поля анкеты. Анкета из localStorage, сохранённая до их появления, их не содержит.
const EMPTY_DETAILS = {
    about_me: null,
    education: null,
    work: null,
    smoking: null,
    alcohol: null,
    height: null,
} satisfies Partial<MockProfile>;

const ADMIN_PROFILE: MockProfile = {
    user_id: 1,
    name: 'Илья',
    birth_date: '2001-04-14',
    sex: 'male',
    dating_goal: 'relationship',
    about_me:
        'Делаю мобильные приложения, а по выходным ухожу в походы и снимаю на плёнку. Ищу человека, с которым интересно и в кофейне, и в палатке.',
    education: 'higher',
    work: 'Мобильный разработчик',
    smoking: 'negative',
    alcohol: 'neutral',
    height: 182,
    tags: ['coffee', 'hiking', 'bicycle', 'photo', 'movies'],
    photos: [
        { id: 1, url: '/img/1.jpg' },
        { id: 2, url: '/img/2.jpg' },
        { id: 3, url: '/img/3.jpg' },
    ],
    filter: { sex: 'all', age_from: 18, age_to: 100 },
};

const NEW_PROFILE: MockProfile = {
    user_id: 2,
    name: null,
    birth_date: null,
    sex: null,
    dating_goal: null,
    ...EMPTY_DETAILS,
    tags: [],
    photos: [],
    filter: null,
};

const DEFAULT_FILTER: SearchFilter = { sex: 'all', age_from: 18, age_to: 100 };

// Анкета живёт в localStorage, чтобы переживать обновление страницы.
// URL загруженных фото после обновления уже не открываются.
let mockProfile: MockProfile = {
    ...EMPTY_DETAILS,
    ...(JSON.parse(localStorage.getItem(PROFILE_KEY) ?? 'null') ?? ADMIN_PROFILE),
};

const LOCATION_KEY = 'mock-location';

const DEFAULT_LOCATION: UserLocation = {
    city: 'Москва',
    district: 'Хамовники',
    coordinates: { latitude: 55.7295, longitude: 37.5738 },
};

// Место, как и анкета, живёт в localStorage. Пока ключа нет, место по умолчанию;
// у нового аккаунта оно сохранено как null.
const storedLocation = localStorage.getItem(LOCATION_KEY);
let mockLocation: UserLocation | null =
    storedLocation === null ? DEFAULT_LOCATION : JSON.parse(storedLocation);

const setMockLocation = (location: UserLocation | null) => {
    mockLocation = location;
    localStorage.setItem(LOCATION_KEY, JSON.stringify(location));
};

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

/**
 * @param {string|null} birthDate - Дата рождения в формате YYYY-MM-DD.
 * @returns {number|null} Полных лет на сегодня или null, если дата не задана.
 */
function ageFromBirthDate(birthDate: string | null): number | null {
    if (!birthDate) {
        return null;
    }

    const [year, month, day] = birthDate.split('-').map(Number);
    const today = new Date();
    const hadBirthday =
        today.getMonth() + 1 > month || (today.getMonth() + 1 === month && today.getDate() >= day);

    return today.getFullYear() - year - (hadBirthday ? 0 : 1);
}

// filter: undefined - фильтр в анкету не входит, JSON его не сохранит.
const profileResponse = () => ({
    status: 200,
    body: {
        ...mockProfile,
        age: ageFromBirthDate(mockProfile.birth_date),
        city: mockLocation?.city ?? null,
        filter: undefined,
        missing: missingFields(),
    },
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
            { id: 1, url: '/img/1.jpg' },
            { id: 2, url: '/img/2.jpg' },
            { id: 3, url: '/img/3.jpg' },
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

const PLACE_SEARCHES_KEY = 'mock-place-searches';

// У всех мок-подборов один search_id: mock-fetch подставляет {id} только вместо чисел,
// а search_id - uuid. Подбор с другим search_id получит 404 от mock-fetch.
const MOCK_SEARCH_ID = '6f1c2b8e-3d4a-4e5f-9a7b-1c2d3e4f5a6b';

const SEARCH_TTL_MS = 24 * 60 * 60 * 1000;

// Партнёр заканчивает голосование через 10 с после нас, то есть ко второму опросу.
const PARTNER_DELAY_MS = 10_000;

const PLACE_CATEGORIES = {
    exhibition: { id: 1, name: 'Выставки' },
    theatre: { id: 2, name: 'Театр' },
    cinema: { id: 3, name: 'Кино' },
    concert: { id: 4, name: 'Концерты' },
    lecture: { id: 5, name: 'Лекции' },
};

// Фото событий: /img/places/<id>.jpg. Особые случаи: 4 и 10 - категория не из словаря,
// 5 - без адреса, 6 - длинное название, 7 - без фото, 8 - без категорий, 10 - две категории.
const PLACE_EVENTS = [
    {
        id: 1,
        name: 'Выставка «Свет и пустота»',
        starts_at: '2026-10-24T12:00:00+03:00',
        image_url: '/img/places/1.jpg',
        url: 'https://afisha.timepad.ru/event/1',
        location: { city: 'Москва', address: 'ул. Пречистенка, 10' },
        categories: [PLACE_CATEGORIES.exhibition],
    },
    {
        id: 2,
        name: 'Спектакль «Двое на качелях»',
        starts_at: '2026-10-31T19:00:00+03:00',
        image_url: '/img/places/2.jpg',
        url: 'https://afisha.timepad.ru/event/2',
        location: { city: 'Москва', address: 'ул. Покровка, 27' },
        categories: [PLACE_CATEGORIES.theatre],
    },
    {
        id: 3,
        name: 'Кино в оригинале: «Перед рассветом»',
        starts_at: '2026-10-24T21:00:00+03:00',
        image_url: '/img/places/3.jpg',
        url: 'https://afisha.timepad.ru/event/3',
        location: { city: 'Москва', address: 'ул. Арбат, 35' },
        categories: [PLACE_CATEGORIES.cinema],
    },
    {
        id: 4,
        name: 'Джазовый вечер в саду «Эрмитаж»',
        starts_at: '2026-11-07T20:00:00+03:00',
        image_url: '/img/places/4.jpg',
        url: 'https://afisha.timepad.ru/event/4',
        location: { city: 'Москва', address: 'ул. Каретный Ряд, 3' },
        categories: [PLACE_CATEGORIES.concert],
    },
    {
        id: 5,
        name: 'Лекция «Как смотреть современное искусство»',
        starts_at: '2026-11-08T16:00:00+03:00',
        image_url: '/img/places/5.jpg',
        url: 'https://afisha.timepad.ru/event/5',
        location: { city: 'Москва', address: null },
        categories: [PLACE_CATEGORIES.lecture],
    },
    {
        id: 6,
        name: 'Иммерсивный спектакль «Вечер в усадьбе, где все гости немного не те, за кого себя выдают»',
        starts_at: '2026-11-13T19:30:00+03:00',
        image_url: '/img/places/6.jpg',
        url: 'https://afisha.timepad.ru/event/6',
        location: { city: 'Москва', address: 'Никитский бульвар, 12' },
        categories: [PLACE_CATEGORIES.theatre],
    },
    {
        id: 7,
        name: 'Ночь кино: марафон фильмов Ричарда Линклейтера',
        starts_at: '2026-11-14T22:00:00+03:00',
        image_url: null,
        url: 'https://afisha.timepad.ru/event/7',
        location: { city: 'Москва', address: 'ул. Тверская, 12' },
        categories: [PLACE_CATEGORIES.cinema],
    },
    {
        id: 8,
        name: 'Мастер-класс по гончарному делу',
        starts_at: '2026-11-15T13:00:00+03:00',
        image_url: '/img/places/8.jpg',
        url: 'https://afisha.timepad.ru/event/8',
        location: { city: 'Москва', address: 'ул. Бауманская, 11' },
        categories: [],
    },
    {
        id: 9,
        name: 'Выставка «Москва в фотографиях 1960-х»',
        starts_at: '2026-11-21T11:00:00+03:00',
        image_url: '/img/places/9.jpg',
        url: 'https://afisha.timepad.ru/event/9',
        location: { city: 'Москва', address: 'ул. Остоженка, 16' },
        categories: [PLACE_CATEGORIES.exhibition],
    },
    {
        id: 10,
        name: 'Стендап-концерт молодых комиков',
        starts_at: '2026-11-22T19:00:00+03:00',
        image_url: '/img/places/10.jpg',
        url: 'https://afisha.timepad.ru/event/10',
        location: { city: 'Москва', address: 'ул. Мясницкая, 13' },
        categories: [PLACE_CATEGORIES.concert, PLACE_CATEGORIES.theatre],
    },
];

interface PlaceSearchScenario {
    eventIds?: number[];
    partnerLikedIds?: number[];
    cancelled?: boolean;
    error?: MockResponse;
}

// Сценарии по match_id из MATCH_ITEMS, остальные мэтчи - обычный подбор с совпадениями.
const PLACE_SEARCH_SCENARIOS: Record<number, PlaceSearchScenario> = {
    99: { partnerLikedIds: [] },
    98: { eventIds: [1] },
    97: { error: error(409, 'NO_EVENTS', 'В этом городе не нашлось событий') },
    96: { error: error(408, 'TIMEPAD_TIMEOUT', 'Timepad не ответил вовремя') },
    95: { cancelled: true },
};

const DEFAULT_PARTNER_LIKED_IDS = [1, 3, 6, 9];

interface MockPlaceSearch {
    city: string;
    created_at: number;
    liked_event_ids: number[] | null;
    finished_at: number | null;
}

// Подборы живут в localStorage по match_id, чтобы переживать обновление страницы.
const loadPlaceSearches = (): Record<number, MockPlaceSearch> =>
    JSON.parse(localStorage.getItem(PLACE_SEARCHES_KEY) ?? '{}');

const savePlaceSearch = (matchId: number, search: MockPlaceSearch | null) => {
    const searches = loadPlaceSearches();

    if (search) {
        searches[matchId] = search;
    } else {
        delete searches[matchId];
    }

    localStorage.setItem(PLACE_SEARCHES_KEY, JSON.stringify(searches));
};

// '/api/v1/matches/100/...' -> 100
const matchIdFromUrl = (url: URL) => Number(url.pathname.split('/')[4]);

/**
 * @param {number} matchId
 * @returns {Object|null} Подбор мэтча или null, если его нет или он истёк. Истёкший удаляется.
 */
function activePlaceSearch(matchId: number): MockPlaceSearch | null {
    const search = loadPlaceSearches()[matchId];

    if (!search) {
        return null;
    }

    if (Date.now() >= search.created_at + SEARCH_TTL_MS) {
        savePlaceSearch(matchId, null);
        return null;
    }

    return search;
}

/**
 * Собирает ответ SearchState. Статус и совпадения считаются на лету, партнёр голосует сам.
 *
 * @param {number} matchId
 * @param {Object} search
 * @returns {Object}
 */
function placeSearchState(matchId: number, search: MockPlaceSearch) {
    const scenario = PLACE_SEARCH_SCENARIOS[matchId] ?? {};
    const partnerLikedIds = scenario.partnerLikedIds ?? DEFAULT_PARTNER_LIKED_IDS;
    const events = scenario.eventIds
        ? PLACE_EVENTS.filter((event) => scenario.eventIds?.includes(event.id))
        : PLACE_EVENTS;

    const liked = search.liked_event_ids;
    const finished = liked !== null;
    const partnerFinished =
        search.finished_at !== null && Date.now() - search.finished_at >= PARTNER_DELAY_MS;

    let status = 'completed';
    if (scenario.cancelled) {
        status = 'cancelled';
    } else if (!finished) {
        status = 'voting';
    } else if (!partnerFinished) {
        status = 'waiting_partner';
    }

    const matches =
        status === 'completed'
            ? events.filter(
                  (event) => liked?.includes(event.id) && partnerLikedIds.includes(event.id),
              )
            : [];

    return {
        search_id: MOCK_SEARCH_ID,
        expires_at: new Date(search.created_at + SEARCH_TTL_MS).toISOString(),
        city: search.city,
        status,
        events,
        current_user_liked_event_ids: liked,
        current_user_finished: finished,
        partner_finished: partnerFinished,
        matches,
    };
}

const placeSearchNotFound = () => error(404, 'SEARCH_NOT_FOUND', 'Подбор не найден или истёк');

/**
 * Приводит изменения анкеты к виду, в котором их хранит бэкенд. Пустой текст очищает поле.
 *
 * @param {Object} changes - Тело PATCH /profile/me.
 * @returns {Object} Копия изменений, где пустые about_me и work заменены на null,
 *     а work обрезан по краям. Остальные поля не меняются.
 */
function normalizeProfileChanges(changes: UpdateProfileRequest): UpdateProfileRequest {
    const normalized = { ...changes };

    if ('about_me' in changes) {
        normalized.about_me = changes.about_me || null;
    }

    if ('work' in changes) {
        normalized.work = changes.work?.trim() || null;
    }

    return normalized;
}

/**
 * Проверяет изменения анкеты по ограничениям из контракта.
 *
 * @param {Object} changes - Тело PATCH /profile/me после normalizeProfileChanges.
 * @returns {Object<string, string>|null} Ошибки по полям или null, если всё верно.
 */
function validateProfileChanges(changes: UpdateProfileRequest): Record<string, string> | null {
    const fields: Record<string, string> = {};
    const { name, about_me: aboutMe, work, height, tags } = changes;

    if (name !== undefined && (name.trim() === '' || name.length > 64)) {
        fields.name = 'имя должно быть от 1 до 64 символов';
    }

    if (aboutMe && aboutMe.length > 1000) {
        fields.about_me = 'описание не должно быть длиннее 1000 символов';
    }

    if (work && work.length > 100) {
        fields.work = 'место работы не должно быть длиннее 100 символов';
    }

    if (height != null && (!Number.isInteger(height) || height < 100 || height > 250)) {
        fields.height = 'рост должен быть от 100 до 250 см';
    }

    if (tags && tags.length > 10) {
        fields.tags = 'можно выбрать не больше 10 тегов';
    }

    return Object.keys(fields).length > 0 ? fields : null;
}

const validationError = (fields: Record<string, string>): MockResponse => ({
    status: 400,
    body: { error: { code: 'VALIDATION_ERROR', message: 'Проверьте поля запроса', fields } },
});

/**
 * Отдаёт анкету собеседника. Как и бэкенд, отвечает только для мэтчей: у остальных 404.
 *
 * @param {URL} url
 * @returns {{status: number, body: Object}}
 */
function matchedProfile(url: URL): MockResponse {
    const userId = Number(url.pathname.split('/').pop());
    const match = MATCH_ITEMS.find((item) => item.user_id === userId);

    if (!match) {
        return error(404, 'PROFILE_NOT_FOUND', 'Целевая анкета не найдена или недоступна');
    }

    const profile: MatchedProfile = {
        match_id: match.match_id,
        user_id: match.user_id,
        name: match.name ?? 'Даша',
        age: match.age ?? 24,
        city: 'Москва',
        about_me:
            'Работаю в книжном издательстве, по выходным катаюсь на велосипеде вдоль реки. Ищу человека, с которым можно молчать и не скучать.',
        education: 'higher',
        work: 'Редактор',
        smoking: 'negative',
        alcohol: 'neutral',
        height: 168,
        dating_goal: 'relationship',
        compatibility: match.compatibility,
        tags: ['books', 'bicycle', 'coffee', 'music', 'hiking'],
        photos: [
            { id: 1, url: '/img/1.jpg' },
            { id: 2, url: '/img/2.jpg' },
            { id: 3, url: '/img/3.jpg' },
            { id: 4, url: '/img/0.jpg' },
        ],
        liked_me: true,
    };

    return { status: 200, body: profile };
}

interface MockLocationPreview {
    city: string;
    district: string;
    coordinates: Coordinates;
}

// Результаты предварительного определения хранятся в памяти и пропадают при перезагрузке.
// Срока годности по времени в моке нет, вместо него результат одноразовый: после PUT он удаляется.
const locationPreviews = new Map<string, MockLocationPreview>();

const isInRange = (value: unknown, min: number, max: number): value is number =>
    typeof value === 'number' && value >= min && value <= max;

/**
 * Заглушка геокодера. Точка в прямоугольнике вокруг Москвы определяется как Москва,
 * любая другая точка внутри грубого прямоугольника России - как Хотьково. Вне него
 * отвечает 422, как по контракту для мест вне России.
 *
 * @param {URL} url
 * @param {{body: *}} request - Тело запроса: широта и долгота.
 * @returns {{status: number, body: Object}}
 */
function previewLocation(url: URL, { body }: { body: unknown }): MockResponse {
    const { latitude, longitude } = (body ?? {}) as Partial<Coordinates>;

    if (!isInRange(latitude, -90, 90) || !isInRange(longitude, -180, 180)) {
        return validationError({ latitude: 'некорректные координаты' });
    }

    const isInRussia = latitude >= 41 && latitude <= 82 && longitude >= 19 && longitude <= 180;

    if (!isInRussia) {
        return error(422, 'LOCATION_NOT_FOUND', 'Не удалось определить местоположение');
    }

    const isInMoscow = latitude >= 55.5 && latitude <= 56 && longitude >= 37.3 && longitude <= 37.9;
    const place = isInMoscow
        ? { city: 'Москва', district: 'Хамовники' }
        : { city: 'Хотьково', district: 'Сергиево-Посадский городской округ' };
    const previewId = `loc_preview_${locationPreviews.size + 1}_${Date.now().toString(36)}`;

    locationPreviews.set(previewId, { ...place, coordinates: { latitude, longitude } });

    return { status: 200, body: { preview_id: previewId, ...place } };
}

/**
 * Сохраняет место по результату предварительного определения.
 *
 * @param {URL} url
 * @param {{body: *}} request - Тело запроса: preview_id.
 * @returns {{status: number, body: Object}}
 */
function confirmLocation(url: URL, { body }: { body: unknown }): MockResponse {
    const previewId = (body as { preview_id?: unknown } | null)?.preview_id;

    if (typeof previewId !== 'string' || previewId === '') {
        return validationError({ preview_id: 'не указан идентификатор результата' });
    }

    const preview = locationPreviews.get(previewId);

    if (!preview) {
        return error(410, 'LOCATION_PREVIEW_UNAVAILABLE', 'Повторите определение местоположения');
    }

    locationPreviews.delete(previewId);
    setMockLocation(preview);

    return { status: 200, body: { location: mockLocation } };
}

export const MOCK_ROUTES: Record<string, MockRoute> = {
    'GET /api/v1/profile/me/short': () => ({
        status: 200,
        body: {
            user_id: mockProfile.user_id,
            name: mockProfile.name,
            age: ageFromBirthDate(mockProfile.birth_date),
            city: mockLocation?.city ?? null,
            photo_url: mockProfile.photos[0]?.url ?? null,
            missing: missingFields(),
        },
    }),
    'GET /api/v1/profile/me': profileResponse,
    'GET /api/v1/profiles/{id}': matchedProfile,
    'GET /api/v1/location/me': () => ({ status: 200, body: { location: mockLocation } }),
    'POST /api/v1/location/me/preview': previewLocation,
    'PUT /api/v1/location/me': confirmLocation,
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
    'POST /api/v1/matches/{id}/search-places': (url, { body }) => {
        const matchId = matchIdFromUrl(url);
        const city = (body as { city?: string } | null)?.city;

        if (typeof city !== 'string' || !city.trim()) {
            return error(400, 'VALIDATION_ERROR', 'Некорректные данные');
        }

        if (!MATCH_ITEMS.some((match) => match.match_id === matchId)) {
            return error(404, 'MATCH_NOT_FOUND', 'Мэтч не найден');
        }

        const scenarioError = PLACE_SEARCH_SCENARIOS[matchId]?.error;
        if (scenarioError) {
            return scenarioError;
        }

        const current = activePlaceSearch(matchId);
        if (current) {
            if (current.city !== city) {
                return error(409, 'SEARCH_ALREADY_ACTIVE', 'Подбор уже идёт в другом городе');
            }

            return { status: 200, body: placeSearchState(matchId, current) };
        }

        const search: MockPlaceSearch = {
            city,
            created_at: Date.now(),
            liked_event_ids: null,
            finished_at: null,
        };
        savePlaceSearch(matchId, search);

        return { status: 201, body: placeSearchState(matchId, search) };
    },
    [`GET /api/v1/matches/{id}/place-searches/${MOCK_SEARCH_ID}`]: (url) => {
        const matchId = matchIdFromUrl(url);
        const search = activePlaceSearch(matchId);

        if (!search) {
            return placeSearchNotFound();
        }

        return { status: 200, body: placeSearchState(matchId, search) };
    },
    [`POST /api/v1/matches/{id}/place-searches/${MOCK_SEARCH_ID}/results`]: (url, { body }) => {
        const matchId = matchIdFromUrl(url);
        const search = activePlaceSearch(matchId);

        if (!search) {
            return placeSearchNotFound();
        }

        const state = placeSearchState(matchId, search);
        const ids = (body as { liked_event_ids?: number[] } | null)?.liked_event_ids;
        const isValid =
            Array.isArray(ids) && ids.every((id) => state.events.some((event) => event.id === id));

        if (!isValid) {
            return error(400, 'VALIDATION_ERROR', 'Некорректные данные');
        }

        if (search.liked_event_ids !== null) {
            return error(409, 'RESULT_ALREADY_SUBMITTED', 'Результат уже отправлен');
        }

        if (state.status !== 'voting') {
            return error(409, 'SEARCH_STATE_CONFLICT', 'Подбор уже нельзя изменить');
        }

        const finished: MockPlaceSearch = {
            ...search,
            liked_event_ids: ids,
            finished_at: Date.now(),
        };
        savePlaceSearch(matchId, finished);

        return { status: 200, body: placeSearchState(matchId, finished) };
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
        setMockLocation(null);

        return authResponse(201);
    },
    'PATCH /api/v1/profile/me': (url, { body }) => {
        const changes = normalizeProfileChanges(body as UpdateProfileRequest);
        const fields = validateProfileChanges(changes);

        if (fields) {
            return validationError(fields);
        }

        saveProfile(changes);

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
        setMockLocation(DEFAULT_LOCATION);

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
