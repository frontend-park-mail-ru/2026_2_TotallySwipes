import type {
    AnswerOption,
    CompatibilityTest,
    ProfileShort,
    TestQuestion,
    TestResult,
} from '../api/api.types.js';
import { read, write, remove } from './storage.js';

type UserId = ProfileShort['user_id'];

export interface TestDraft {
    testId?: CompatibilityTest['test_id'];
    current?: number;
    answers: Record<TestQuestion['id'], AnswerOption['value']>;
}

function draftKey(userId: UserId): string {
    return `test-draft:${userId}`;
}

function resultKey(userId: UserId): string {
    return `test-result:${userId}`;
}

/**
 * Сохраняет черновик прохождения теста.
 *
 * @param {number|string} userId
 * @param {{testId: number, current: number, answers: Object<number, number>}} draft
 */
export function saveDraft(userId: UserId, draft: TestDraft): void {
    write(draftKey(userId), draft);
}

/**
 * Создаёт пустой черновик, чтобы тест начался заново, а не открылся старый результат.
 *
 * @param {number|string} userId
 */
export function startDraft(userId: UserId): void {
    const draft: TestDraft = { answers: {} };
    write(draftKey(userId), draft);
}

/**
 * @param {number|string} userId
 * @returns {Object|null} Черновик теста пользователя.
 */
export function loadDraft(userId: UserId): TestDraft | null {
    return read<TestDraft>(draftKey(userId));
}

/**
 * @param {number|string} userId
 */
export function clearDraft(userId: UserId): void {
    remove(draftKey(userId));
}

/**
 * Сохраняет результат теста, полученный с бэкенда.
 *
 * @param {number|string} userId
 * @param {Object} result
 */
export function saveResult(userId: UserId, result: TestResult): void {
    write(resultKey(userId), result);
}

/**
 * @param {number|string} userId
 * @returns {Object|null} Сохранённый результат теста.
 */
export function loadResult(userId: UserId): TestResult | null {
    return read<TestResult>(resultKey(userId));
}

/**
 * @param {number|string} userId
 */
export function clearResult(userId: UserId): void {
    remove(resultKey(userId));
}
