import { SwipeAction } from '../../../api/api.types';

const SWIPE_THRESHOLD = 120;
const ROTATION_COEF = 0.05;

interface DragInfo {
    startX: number;
    startY: number;
    card: HTMLElement;
    dx: number;
    dy: number;
}

interface StackOptions {
    onSwipe: (direction: SwipeAction) => void;
}

function clamp01(value: number): number {
    return Math.min(Math.max(value, 0), 1);
}

/**
 * Выставляет прозрачность штампов лайка, дизлайка и суперлайка по смещению карточки.
 *
 * @param {HTMLElement} card
 * @param {number} dx
 * @param {number} dy
 */
function setStamps(card: HTMLElement, dx: number, dy: number) {
    card.style.setProperty('--swipe-like', String(clamp01(dx / SWIPE_THRESHOLD)));
    card.style.setProperty('--swipe-dislike', String(clamp01(-dx / SWIPE_THRESHOLD)));
    card.style.setProperty('--swipe-super', String(clamp01(-dy / SWIPE_THRESHOLD)));
}

/**
 * Возвращает карточку на место и прячет штампы.
 *
 * @param {HTMLElement} card
 */
function resetCard(card: HTMLElement) {
    card.style.transform = '';
    setStamps(card, 0, 0);
}

/**
 * Включает перетаскивание верхней карточки стопки.
 *
 * @param {HTMLElement} stackElement - Контейнер карточек, верхняя - последняя.
 * @param {Object} params
 * @param {function(string): void} params.onSwipe - Вызывается с направлением после того,
 *     как карточка улетела.
 * @returns {{swipe: function(string): void}}
 */
export function initStack(stackElement: HTMLElement, { onSwipe }: StackOptions) {
    let isAnimating = false;
    let drag: DragInfo | null = null;

    stackElement.addEventListener('pointerdown', (event) => {
        if (isAnimating || event.button !== 0 || !(event.target instanceof Element)) return;

        const top = stackElement.lastElementChild;

        if (!(top instanceof HTMLElement)) {
            isAnimating = false;
            return;
        }

        if (event.target.closest('.feed__card') !== top) return;

        drag = {
            startX: event.clientX,
            startY: event.clientY,
            card: top,
            dx: 0,
            dy: 0,
        };

        drag.card.setPointerCapture(event.pointerId);
        drag.card.classList.add('feed__card_dragging');
    });

    stackElement.addEventListener('pointermove', (event) => {
        if (!drag) return;
        const dx = event.clientX - drag.startX;
        const dy = event.clientY - drag.startY;

        drag.dx = dx;
        drag.dy = dy;

        drag.card.style.transform = `translate(${dx}px, ${dy}px) rotate(${dx * ROTATION_COEF}deg)`;

        setStamps(drag.card, drag.dx, drag.dy);
    });

    stackElement.addEventListener('pointerup', () => {
        if (!drag) return;

        drag.card.classList.remove('feed__card_dragging');

        let direction: SwipeAction | null = null;

        if (Math.abs(drag.dx) > Math.abs(drag.dy)) {
            if (Math.abs(drag.dx) > SWIPE_THRESHOLD) {
                if (drag.dx > 0) {
                    direction = 'like';
                } else {
                    direction = 'dislike';
                }
            }
        } else if (drag.dy < -SWIPE_THRESHOLD) {
            direction = 'super';
        }

        if (direction) {
            swipe(direction);
        } else {
            resetCard(drag.card);
        }

        drag = null;
    });

    stackElement.addEventListener('pointercancel', () => {
        if (!drag) return;
        resetCard(drag.card);
        drag.card.classList.remove('feed__card_dragging');
        drag = null;
    });

    /**
     * Анимирует уход верхней карточки и удаляет её.
     *
     * @param {'like'|'dislike'|'super'} direction
     */
    function swipe(direction: SwipeAction) {
        if (isAnimating) return;
        isAnimating = true;

        const top = stackElement.lastElementChild;
        if (!(top instanceof HTMLElement)) {
            isAnimating = false;
            return;
        }

        top.style.transform = '';
        top.style.setProperty(`--swipe-${direction}`, '1');
        top.classList.add(`feed__card_leaving_${direction}`);

        top.addEventListener('transitionend', (event) => {
            if (event.target !== top || event.propertyName !== 'transform') return;

            top.remove();

            onSwipe(direction);

            isAnimating = false;
        });
    }

    return { swipe };
}
