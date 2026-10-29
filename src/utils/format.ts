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
