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
