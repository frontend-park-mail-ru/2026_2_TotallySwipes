/**
 * Возвращает первый элемент по селектору внутри родителя.
 * Если элемента нет, выбрасывает ошибку.
 *
 * @param parent - Узел, внутри которого идёт поиск.
 * @param selector - CSS-селектор.
 * @returns Найденный элемент.
 * @throws {Error} Если элемент по селектору не найден.
 */
export function getElement<T extends Element = HTMLElement>(
    parent: ParentNode,
    selector: string,
): T {
    const element = parent.querySelector<T>(selector);

    if (!element) {
        throw new Error(`Элемент ${selector} не найден`);
    }

    return element;
}

/**
 * Форма с известными полями в `elements`.
 */
export interface TypedForm<E> extends HTMLFormElement {
    elements: HTMLFormControlsCollection & E;
}

/**
 * Возвращает первый переключатель группы radio. Нужен, чтобы показать ошибку
 * группы: `RadioNodeList` индексируется как `Node`, а ошибку вешаем на input.
 *
 * @param group - Группа переключателей из `form.elements`.
 * @returns Первый переключатель группы.
 * @throws {Error} Если группа пуста.
 */
export function firstRadio(group: RadioNodeList): HTMLInputElement {
    const input = group[0];

    if (!(input instanceof HTMLInputElement)) {
        throw new Error('Группа переключателей пуста');
    }

    return input;
}

/**
 * Приводит значение поля формы к одному из известных вариантов.
 *
 * @param options - Допустимые варианты.
 * @param value - Значение из DOM.
 * @returns Значение нужного типа или `undefined`, если его нет среди допустимых.
 */
export function asOption<T extends string>(options: readonly T[], value: string): T | undefined {
    return options.find((option) => option === value);
}

/**
 * Возвращает все элементы по селектору внутри родителя.
 * Если ни одного нет, выбрасывает ошибку.
 *
 * @param parent - Узел, внутри которого идёт поиск.
 * @param selector - CSS-селектор.
 * @returns Найденные элементы.
 * @throws {Error} Если элементы по селектору не найдены.
 */
export function getAllElements<T extends Element = HTMLElement>(
    parent: ParentNode,
    selector: string,
): NodeListOf<T> {
    const elements = parent.querySelectorAll<T>(selector);

    if (elements.length === 0) {
        throw new Error(`Элементы по селектору "${selector}" не найдены`);
    }

    return elements;
}
