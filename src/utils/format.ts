/**
 * Дополняет значение ведущими нулями до заданной длины.
 *
 * @param value - Значение.
 * @param length - Минимальная длина результата. По умолчанию 2.
 * @returns Строка с ведущими нулями.
 */
export function padWithZeros(value: number | string, length: number = 2): string {
    return String(value).padStart(length, '0');
}

const longDateFormat = new Intl.DateTimeFormat('ru', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    timeZone: 'UTC',
});

/**
 * Начало события в виде строк для билета.
 */
export interface EventDate {
    /** Время, '12:00'. */
    time: string;
    /** Полная дата, 'Суббота, 24 октября'. */
    date: string;
}

/**
 * Разбирает начало события. Время и дату читает из самой строки, без пояса браузера:
 * показываем местное время события, а не время пользователя.
 *
 * @param startsAt - Начало в ISO 8601 со смещением, '2026-10-24T12:00:00+03:00'.
 * @returns Строки для билета.
 */
export function formatEventDate(startsAt: string): EventDate {
    const day = new Date(`${startsAt.slice(0, 10)}T00:00:00Z`);
    const date = longDateFormat.format(day);

    return {
        time: startsAt.slice(11, 16),
        date: date.charAt(0).toUpperCase() + date.slice(1),
    };
}
