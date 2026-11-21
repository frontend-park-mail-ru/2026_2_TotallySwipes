/** Минимальный горизонтальный сдвиг пальца, который считается свайпом, px. */
const SWIPE_MIN_DISTANCE = 50;
/** Во сколько раз горизонтальный сдвиг должен превышать вертикальный. Иначе это прокрутка. */
const SWIPE_DIRECTION_RATIO = 1.5;

/**
 * Параметры листания фото свайпом.
 */
export interface PhotoSwipeOptions {
    /** Селектор области с фото, по которой свайпают. */
    frameSelector: string;
    /** Получает шаг: 1 - следующее фото (свайп влево), -1 - предыдущее (свайп вправо). */
    onSwipe: (step: 1 | -1) => void;
}

/**
 * Включает листание фото свайпом влево и вправо. Реагирует только на касания: мышью фото
 * листают другими способами. Вертикальные жесты остаются обычной прокруткой страницы, для
 * этого у области с фото должен быть `touch-action: pan-y`. Слушатели висят на корне,
 * поэтому переживают перерисовку фото.
 *
 * @param root - Элемент, внутри которого лежит область с фото.
 * @param options - Параметры листания.
 */
export function initPhotoSwipe(
    root: HTMLElement,
    { frameSelector, onSwipe }: PhotoSwipeOptions,
): void {
    let start: { pointerId: number; x: number; y: number } | null = null;

    root.addEventListener('pointerdown', (event) => {
        const target = event.target instanceof Element ? event.target : null;

        // Кнопки поверх фото (например, Заменить и Удалить) работают как обычно.
        if (
            event.pointerType !== 'touch' ||
            !event.isPrimary ||
            !target?.closest(frameSelector) ||
            target.closest('button')
        ) {
            return;
        }

        start = { pointerId: event.pointerId, x: event.clientX, y: event.clientY };
    });

    root.addEventListener('pointerup', (event) => {
        if (!start || event.pointerId !== start.pointerId) {
            return;
        }

        const dx = event.clientX - start.x;
        const dy = event.clientY - start.y;

        start = null;

        if (
            Math.abs(dx) >= SWIPE_MIN_DISTANCE &&
            Math.abs(dx) > Math.abs(dy) * SWIPE_DIRECTION_RATIO
        ) {
            onSwipe(dx < 0 ? 1 : -1);
        }
    });

    root.addEventListener('pointercancel', () => {
        start = null;
    });
}
