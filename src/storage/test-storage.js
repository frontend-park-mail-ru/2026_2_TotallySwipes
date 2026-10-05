function draftKey(userId) {
    return `test-draft:${userId}`;
}

function resultKey(userId) {
    return `test-result:${userId}`;
}

/**
 * Читает JSON из localStorage.
 *
 * @param {string} key
 * @returns {*} Значение или null, если его нет или хранилище недоступно.
 */
function read(key) {
    try {
        return JSON.parse(localStorage.getItem(key));
    } catch {
        return null;
    }
}

/**
 * Пишет значение в localStorage как JSON, ошибки хранилища игнорирует.
 *
 * @param {string} key
 * @param {*} value
 */
function write(key, value) {
    try {
        localStorage.setItem(key, JSON.stringify(value));
    } catch {
        return;
    }
}

function remove(key) {
    try {
        localStorage.removeItem(key);
    } catch {
        return;
    }
}

/**
 * Сохраняет черновик прохождения теста.
 *
 * @param {number|string} userId
 * @param {{testId: number, current: number, answers: Object<number, number>}} draft
 */
export function saveDraft(userId, draft) {
    write(draftKey(userId), draft);
}

/**
 * Создаёт пустой черновик, чтобы тест начался заново, а не открылся старый результат.
 *
 * @param {number|string} userId
 */
export function startDraft(userId) {
    write(draftKey(userId), { answers: {} });
}

/**
 * @param {number|string} userId
 * @returns {Object|null} Черновик теста пользователя.
 */
export function loadDraft(userId) {
    return read(draftKey(userId));
}

/**
 * @param {number|string} userId
 */
export function clearDraft(userId) {
    remove(draftKey(userId));
}

/**
 * Сохраняет результат теста, полученный с бэкенда.
 *
 * @param {number|string} userId
 * @param {Object} result
 */
export function saveResult(userId, result) {
    write(resultKey(userId), result);
}

/**
 * @param {number|string} userId
 * @returns {Object|null} Сохранённый результат теста.
 */
export function loadResult(userId) {
    return read(resultKey(userId));
}

/**
 * @param {number|string} userId
 */
export function clearResult(userId) {
    remove(resultKey(userId));
}
