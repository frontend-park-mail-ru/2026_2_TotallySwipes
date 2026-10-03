const FEED_ITEMS = [
    {
        user_id: 42,
        name: 'Алина',
        about_me:
            'Работаю в книжном издательстве, по выходным катаюсь на велосипеде вдоль реки. Ищу человека, с которым можно молчать и не скучать.',
        dating_intent: 'Ищу половинку',
        compatibility: 0.87,
        age: 24,
        tags: ['books', 'bicycle', 'coffee', 'music', 'hiking'],
        photos: [{ id: 1, url: '/public/img/1.jpg' }],
    },
    {
        user_id: 43,
        name: 'Марфа',
        about_me: 'Пеку хлеб на закваске и хожу на все концерты, до которых могу доехать.',
        dating_intent: 'Ищу половинку',
        compatibility: 0.82,
        age: 25,
        tags: ['cooking', 'concerts', 'animals'],
        photos: [{ id: 2, url: '/public/img/2.jpg' }],
    },
    {
        user_id: 44,
        name: 'Мадина',
        about_me: 'Бегаю по утрам, по вечерам играю в настолки.',
        dating_intent: 'Ищу общение',
        compatibility: 0.91,
        age: 26,
        tags: ['running', 'board_games', 'sport'],
        photos: [{ id: 3, url: '/public/img/3.jpg' }],
    },
    {
        user_id: 45,
        name: 'Алина',
        about_me: 'Фотографирую город и рисую акварелью.',
        dating_intent: 'Ищу встречи',
        compatibility: 0.76,
        age: 27,
        tags: ['photo', 'painting', 'travel'],
        photos: [{ id: 4, url: '/public/img/1.jpg' }],
    },
    {
        user_id: 46,
        name: 'Марфа',
        about_me: null,
        dating_intent: 'Ищу половинку',
        compatibility: 0.64,
        age: 28,
        tags: ['movies'],
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
    'GET /api/v1/user/me': {
        status: 200,
        body: { id: 1, name: 'User', age: 25, city: 'Москва', avatar: null },
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
    'POST /api/v1/tests/1/results': {
        status: 201,
        body: {
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
        },
    },
    'POST /api/v1/auth/logout': {
        status: 204,
    },
};
