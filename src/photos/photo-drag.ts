/** Сколько нужно держать палец на фото, чтобы начать перетаскивание, мс. */
const LONG_PRESS_MS = 250;
/** Сдвиг мыши, после которого начинается перетаскивание, px. */
const MOUSE_START_DISTANCE = 6;
/** Сдвиг пальца до долгого нажатия, после которого это считается прокруткой страницы, px. */
const TOUCH_SCROLL_DISTANCE = 10;

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
 * Состояние одного жеста: от нажатия до отпускания.
 */
interface DragGesture {
    pointerId: number;
    pointerType: string;
    slot: HTMLElement;
    from: number;
    startX: number;
    startY: number;
    /** Положение слота на странице в момент нажатия: от него считается положение призрака. */
    rect: DOMRect;
    /** Перетаскивание началось: фото взято и за пальцем или курсором едет призрак. */
    isActive: boolean;
    /** Указатель сдвинулся достаточно, чтобы считать жест перетаскиванием, а не тапом. */
    isMoved: boolean;
    /** Таймер долгого нажатия для касаний. */
    timer: number | null;
    ghost: HTMLElement | null;
}

/**
 * Включает перестановку фото перетаскиванием. Работает и мышью, и пальцем: мышь начинает
 * перетаскивание сразу после небольшого сдвига, палец после долгого нажатия, чтобы не
 * мешать прокрутке страницы. Слушатели висят на корне, поэтому переживают перерисовку слотов.
 *
 * Слоты не должны быть `draggable`: нативное перетаскивание перехватывает события указателя.
 *
 * @param root - Элемент, внутри которого лежат слоты.
 * @param options - Параметры перестановки.
 */
export function initPhotoDrag(
    root: HTMLElement,
    { slotSelector, draggingClass, dropTargetClass, onMove }: PhotoDragOptions,
): void {
    let gesture: DragGesture | null = null;
    let lastPointerType = 'mouse';
    let shouldSuppressClick = false;

    const slotAt = (target: EventTarget | null) =>
        target instanceof Element ? target.closest<HTMLElement>(slotSelector) : null;

    const slotUnder = (x: number, y: number) => {
        const slot = slotAt(document.elementFromPoint(x, y));

        return slot && root.contains(slot) ? slot : null;
    };

    const clearTargets = () => {
        root.querySelectorAll(`.${dropTargetClass}`).forEach((slot) => {
            slot.classList.remove(dropTargetClass);
        });
    };

    /**
     * Берёт фото: ставит призрак поверх слота и блокирует прокрутку.
     */
    function activate() {
        if (!gesture || gesture.isActive) {
            return;
        }

        const { slot, rect } = gesture;
        const ghost = slot.cloneNode(true) as HTMLElement;

        ghost.removeAttribute('data-index');
        ghost.style.cssText = [
            'position: fixed',
            `left: ${rect.left}px`,
            `top: ${rect.top}px`,
            `width: ${rect.width}px`,
            `height: ${rect.height}px`,
            'margin: 0',
            'z-index: 1000',
            'pointer-events: none',
            'opacity: 0.9',
            'box-shadow: 0 16px 32px -12px rgba(20, 20, 20, 0.45)',
        ].join(';');

        document.body.append(ghost);
        slot.classList.add(draggingClass);

        gesture.ghost = ghost;
        gesture.isActive = true;
    }

    /**
     * Заканчивает жест: убирает призрак, подсветку и слушатели документа.
     */
    function finish() {
        if (!gesture) {
            return;
        }

        if (gesture.timer !== null) {
            clearTimeout(gesture.timer);
        }

        gesture.ghost?.remove();
        gesture.slot.classList.remove(draggingClass);
        clearTargets();

        document.removeEventListener('pointermove', handleMove);
        document.removeEventListener('pointerup', handleUp);
        document.removeEventListener('pointercancel', handleCancel);

        gesture = null;
    }

    function handleMove(event: PointerEvent) {
        if (!gesture || event.pointerId !== gesture.pointerId) {
            return;
        }

        const dx = event.clientX - gesture.startX;
        const dy = event.clientY - gesture.startY;
        const distance = Math.hypot(dx, dy);

        if (!gesture.isActive) {
            if (gesture.pointerType === 'mouse' && distance > MOUSE_START_DISTANCE) {
                activate();
            } else if (gesture.pointerType !== 'mouse' && distance > TOUCH_SCROLL_DISTANCE) {
                // Палец поехал до долгого нажатия: пользователь прокручивает страницу.
                finish();
                return;
            } else {
                return;
            }
        }

        gesture.isMoved ||= distance > MOUSE_START_DISTANCE;
        if (gesture.ghost) {
            gesture.ghost.style.transform = `translate(${dx}px, ${dy}px) scale(1.04)`;
        }

        clearTargets();
        const target = slotUnder(event.clientX, event.clientY);
        if (target && Number(target.dataset.index) !== gesture.from) {
            target.classList.add(dropTargetClass);
        }
    }

    function handleUp(event: PointerEvent) {
        if (!gesture || event.pointerId !== gesture.pointerId) {
            return;
        }

        const { from, isActive, isMoved } = gesture;
        const target = isActive ? slotUnder(event.clientX, event.clientY) : null;
        const to = target ? Number(target.dataset.index) : from;

        // После перетаскивания браузер шлёт click на слот: он не должен выбирать фото.
        shouldSuppressClick = isMoved;
        setTimeout(() => {
            shouldSuppressClick = false;
        }, 0);

        finish();
        if (to !== from) {
            onMove(from, to);
        }
    }

    function handleCancel(event: PointerEvent) {
        if (gesture && event.pointerId === gesture.pointerId) {
            finish();
        }
    }

    root.addEventListener('pointerdown', (event) => {
        lastPointerType = event.pointerType;

        const slot = slotAt(event.target);
        const control = event.target instanceof Element ? event.target.closest('button') : null;

        // Кнопки внутри слота (например, удаление) работают как обычно.
        if (gesture || !slot || (control && slot.contains(control))) {
            return;
        }
        if (event.pointerType === 'mouse' && event.button !== 0) {
            return;
        }

        gesture = {
            pointerId: event.pointerId,
            pointerType: event.pointerType,
            slot,
            from: Number(slot.dataset.index),
            startX: event.clientX,
            startY: event.clientY,
            rect: slot.getBoundingClientRect(),
            isActive: false,
            isMoved: false,
            timer: null,
            ghost: null,
        };

        if (event.pointerType === 'mouse') {
            event.preventDefault();
        } else {
            gesture.timer = window.setTimeout(activate, LONG_PRESS_MS);
        }

        document.addEventListener('pointermove', handleMove);
        document.addEventListener('pointerup', handleUp);
        document.addEventListener('pointercancel', handleCancel);
    });

    // Пока фото взято, страница не должна прокручиваться вслед за пальцем. Браузер решает,
    // можно ли отменить прокрутку, по слушателям, которые были на момент начала касания,
    // поэтому слушатель висит на корне всегда и срабатывает только во время перетаскивания.
    root.addEventListener(
        'touchmove',
        (event) => {
            if (gesture?.isActive && event.cancelable) {
                event.preventDefault();
            }
        },
        { passive: false },
    );

    root.addEventListener(
        'click',
        (event) => {
            if (shouldSuppressClick) {
                event.stopPropagation();
                event.preventDefault();
                shouldSuppressClick = false;
            }
        },
        true,
    );

    // Долгое нажатие на фото на телефоне открывает контекстное меню браузера вместо перетаскивания.
    root.addEventListener('contextmenu', (event) => {
        if (lastPointerType !== 'mouse' && slotAt(event.target)) {
            event.preventDefault();
        }
    });
}
