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
