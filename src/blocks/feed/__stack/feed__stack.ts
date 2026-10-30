import { type SwipeAction } from '../../../api/api.types';

const SWIPE_THRESHOLD = 120;
const TAP_THRESHOLD = 5;
const ROTATION_COEF = 0.05;

interface DragInfo {
    startX: number;
    startY: number;
    card: HTMLElement;
    dx: number;
    dy: number;
}

type StackAction = SwipeAction | 'tap';

interface StackOptions {
    onSwipe: (card: HTMLElement, direction: SwipeAction) => void;
    onTap: (card: HTMLElement, clientX: number, clientY: number) => void;
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
export function initStack(stackElement: HTMLElement, { onSwipe, onTap }: StackOptions) {
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

    stackElement.addEventListener('pointerup', (event) => {
        if (!drag) return;

        drag.card.classList.remove('feed__card_dragging');

        let direction: StackAction | null = null;

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

        if (Math.abs(drag.dx) < TAP_THRESHOLD && Math.abs(drag.dy) < TAP_THRESHOLD) {
            direction = 'tap';
        }

        if (direction) {
            if (direction === 'tap') {
                onTap(drag.card, event.clientX, event.clientY);
                resetCard(drag.card);
            } else {
                swipe(drag.card, direction);
            }
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
     * @returns {boolean} Идёт ли сейчас анимация карточки.
     */
    function isStackAnimating() {
        return isAnimating;
    }

    /**
     * Анимирует уход верхней карточки и удаляет её.
     *
     * @param {'like'|'dislike'|'super'} direction
     */
    function swipe(card: HTMLElement, direction: SwipeAction) {
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
            onSwipe(card, direction);

            isAnimating = false;
        });
    }

    /**
     * Анимирует возврат уже вставленной карточки оттуда, куда она улетела.
     *
     * @param {HTMLElement} card - Карточка, только что вставленная наверх стопки.
     * @param {'like'|'dislike'|'super'} direction - Куда карточка улетала.
     */
    function unswipe(card: HTMLElement, direction: SwipeAction) {
        if (isAnimating) return;
        isAnimating = true;

        card.style.setProperty(`--swipe-${direction}`, '1');
        card.classList.add(`feed__card_leaving_${direction}`);

        // рефлоу чтобы браузер запомнил стартовое положение за экраном
        void card.offsetWidth;

        card.style.setProperty(`--swipe-${direction}`, '0');
        card.classList.remove(`feed__card_leaving_${direction}`);

        card.addEventListener('transitionend', (event) => {
            if (event.target !== card || event.propertyName !== 'transform') return;

            isAnimating = false;
        });
    }

    return { swipe, unswipe, isStackAnimating };
}
