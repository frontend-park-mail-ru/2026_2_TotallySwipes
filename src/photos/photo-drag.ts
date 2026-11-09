/**
 * Параметры перестановки фото перетаскиванием.
 */
export interface PhotoDragOptions {
    /** Селектор слотов с фото, которые можно перетаскивать. У слота есть `data-index`. */
    slotSelector: string;
    /** CSS-класс перетаскиваемого слота. */
    draggingClass: string;
    /** CSS-класс слота, над которым находится перетаскиваемое фото. */
    dropTargetClass: string;
    /** Получает позиции from и to. */
    onMove: (from: number, to: number) => void;
}

/**
 * Включает перестановку фото перетаскиванием. Слушатели висят на корне, поэтому
 * переживают перерисовку слотов.
 *
 * @param root - Элемент, внутри которого лежат слоты.
 * @param options - Параметры перестановки.
 */
export function initPhotoDrag(
    root: HTMLElement,
    { slotSelector, draggingClass, dropTargetClass, onMove }: PhotoDragOptions,
): void {
    let from: number | null = null;

    const slotOf = (event: Event) =>
        event.target instanceof Element ? event.target.closest<HTMLElement>(slotSelector) : null;
    const clearTargets = () => {
        root.querySelectorAll(`.${dropTargetClass}`).forEach((slot) => {
            slot.classList.remove(dropTargetClass);
        });
    };

    root.addEventListener('dragstart', (event) => {
        const slot = slotOf(event);
        if (!slot) {
            return;
        }

        from = Number(slot.dataset.index);
        if (event.dataTransfer) {
            event.dataTransfer.effectAllowed = 'move';
        }
        slot.classList.add(draggingClass);
    });

    root.addEventListener('dragover', (event) => {
        const slot = slotOf(event);
        if (from === null || !slot) {
            return;
        }

        event.preventDefault();
        clearTargets();
        if (Number(slot.dataset.index) !== from) {
            slot.classList.add(dropTargetClass);
        }
    });

    root.addEventListener('drop', (event) => {
        const slot = slotOf(event);
        if (from === null || !slot) {
            return;
        }

        event.preventDefault();
        const start = from;
        const to = Number(slot.dataset.index);

        from = null;
        if (to !== start) {
            onMove(start, to);
        }
    });

    root.addEventListener('dragend', () => {
        from = null;
        clearTargets();
        root.querySelector(`.${draggingClass}`)?.classList.remove(draggingClass);
    });
}
