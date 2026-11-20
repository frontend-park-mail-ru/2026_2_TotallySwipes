import { type SwipeAction } from '../../api/api.types';

const SWIPE_THRESHOLD = 120;
const TAP_THRESHOLD = 5;
const ROTATION_COEF = 0.05;
const ALL_DIRECTIONS: SwipeAction[] = ['like', 'dislike', 'super'];

interface DragInfo {
    pointerId: number;
    threshold: number;
    startX: number;
    startY: number;
    card: HTMLElement;
    dx: number;
    dy: number;
}

type StackAction = SwipeAction | 'tap';

interface StackOptions {
    onSwipe: (card: HTMLElement, direction: SwipeAction) => void;
    onTap?: (card: HTMLElement, clientX: number, clientY: number) => void;
    directions?: SwipeAction[];
}

function clamp01(value: number): number {
    return Math.min(Math.max(value, 0), 1);
}

/**
 * Расставляет модификаторы слоёв: у верхней карточки layer_1.
 *
 * @param {HTMLElement} stackElement
 */
export function updateLayers(stackElement: HTMLElement) {
    const cards = [...stackElement.children].reverse();

    cards.forEach((card, index) => {
        card.classList.remove(
            'swipe-stack__card_layer_1',
            'swipe-stack__card_layer_2',
            'swipe-stack__card_layer_3',
        );
        card.classList.add(`swipe-stack__card_layer_${index + 1}`);
        card.toggleAttribute('inert', index !== 0);
    });
}

/**
 * Выставляет прозрачность штампов лайка, дизлайка и суперлайка по смещению карточки.
 *
 * @param {HTMLElement} card
 * @param {number} dx
 * @param {number} dy
 */
function setStamps(card: HTMLElement, dx: number, dy: number, threshold = SWIPE_THRESHOLD) {
    card.style.setProperty('--swipe-like', String(clamp01(dx / threshold)));
    card.style.setProperty('--swipe-dislike', String(clamp01(-dx / threshold)));
    card.style.setProperty('--swipe-super', String(clamp01(-dy / threshold)));
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
 * @param {string[]} [params.directions] - Направления, доступные для свайпа жестом.
 *     По умолчанию все.
 * @returns {{swipe: function(string): void}}
 */
export function initStack(
    stackElement: HTMLElement,
    { onSwipe, onTap, directions = ALL_DIRECTIONS }: StackOptions,
) {
    let animatingCard: HTMLElement | null = null;
    let drag: DragInfo | null = null;

    stackElement.addEventListener('pointerdown', (event) => {
        if (
            isStackAnimating() ||
            !event.isPrimary ||
            event.button !== 0 ||
            !(event.target instanceof Element)
        ) {
            return;
        }

        const top = stackElement.lastElementChild;

        if (!(top instanceof HTMLElement)) return;
        if (drag && drag.card === top) return;

        if (event.target.closest('.swipe-stack__card') !== top) return;

        if (event.target.closest('a, button')) return;

        let threshold = SWIPE_THRESHOLD;
        if (event.pointerType === 'touch') {
            threshold = Math.min(SWIPE_THRESHOLD, Math.ceil(top.clientWidth / 3));
        }

        drag = {
            pointerId: event.pointerId,
            threshold,
            startX: event.clientX,
            startY: event.clientY,
            card: top,
            dx: 0,
            dy: 0,
        };

        drag.card.setPointerCapture(event.pointerId);
        drag.card.classList.add('swipe-stack__card_dragging');
    });

    stackElement.addEventListener('pointermove', (event) => {
        if (!drag || drag.pointerId !== event.pointerId) return;
        const dx = event.clientX - drag.startX;
        const dy = event.clientY - drag.startY;

        drag.dx = dx;
        drag.dy = dy;

        drag.card.style.transform = `translate(${dx}px, ${dy}px) rotate(${dx * ROTATION_COEF}deg)`;

        setStamps(drag.card, dx, dy, drag.threshold);
    });

    stackElement.addEventListener('pointerup', (event) => {
        if (!drag || drag.pointerId !== event.pointerId) return;
        const { card, dx, dy, threshold } = drag;
        drag = null;
        card.classList.remove('swipe-stack__card_dragging');
        if (card !== stackElement.lastElementChild) {
            resetCard(card);
            return;
        }

        let direction: StackAction | null = null;

        if (Math.abs(dx) > Math.abs(dy)) {
            if (Math.abs(dx) > threshold) {
                if (dx > 0) {
                    direction = 'like';
                } else {
                    direction = 'dislike';
                }
            }
        } else if (dy < -threshold) {
            direction = 'super';
        }

        if (direction && !directions.includes(direction)) {
            direction = null;
        }

        if (Math.abs(dx) < TAP_THRESHOLD && Math.abs(dy) < TAP_THRESHOLD) {
            direction = 'tap';
        }

        if (direction) {
            if (direction === 'tap') {
                if (onTap) onTap(card, event.clientX, event.clientY);
                resetCard(card);
            } else {
                swipe(card, direction);
            }
        } else {
            resetCard(card);
        }
    });

    stackElement.addEventListener('pointercancel', (event) => {
        if (!drag || drag.pointerId !== event.pointerId) return;
        resetCard(drag.card);
        drag.card.classList.remove('swipe-stack__card_dragging');
        drag = null;
    });

    /**
     * @returns {boolean} Идёт ли сейчас анимация карточки.
     */
    function isStackAnimating() {
        return animatingCard !== null && animatingCard.parentElement === stackElement;
    }

    /**
     * Анимирует уход верхней карточки и удаляет её.
     *
     * @param {'like'|'dislike'|'super'} direction
     */
    function swipe(card: HTMLElement, direction: SwipeAction) {
        if (isStackAnimating() || card !== stackElement.lastElementChild) return;
        if (drag && drag.card === card) return;

        animatingCard = card;
        card.style.transform = '';
        card.style.setProperty(`--swipe-${direction}`, '1');
        card.classList.add(`swipe-stack__card_leaving_${direction}`);

        card.addEventListener('transitionend', function finishSwipe(event) {
            if (event.target !== card || event.propertyName !== 'transform') return;
            card.removeEventListener('transitionend', finishSwipe);

            if (animatingCard !== card) return;
            animatingCard = null;
            if (card.parentElement !== stackElement) return;
            card.remove();
            onSwipe(card, direction);
        });
    }

    /**
     * Анимирует возврат уже вставленной карточки оттуда, куда она улетела.
     *
     * @param {HTMLElement} card - Карточка, только что вставленная наверх стопки.
     * @param {'like'|'dislike'|'super'} direction - Куда карточка улетала.
     */
    function unswipe(card: HTMLElement, direction: SwipeAction) {
        if (isStackAnimating() || card !== stackElement.lastElementChild) return;
        animatingCard = card;

        card.style.setProperty(`--swipe-${direction}`, '1');
        card.classList.add(`swipe-stack__card_leaving_${direction}`);

        // рефлоу чтобы браузер запомнил стартовое положение за экраном
        void card.offsetWidth;

        card.style.setProperty(`--swipe-${direction}`, '0');
        card.classList.remove(`swipe-stack__card_leaving_${direction}`);

        card.addEventListener('transitionend', function finishUnswipe(event) {
            if (event.target !== card || event.propertyName !== 'transform') return;
            card.removeEventListener('transitionend', finishUnswipe);

            if (animatingCard === card) animatingCard = null;
        });
    }

    return { swipe, unswipe, isStackAnimating };
}
