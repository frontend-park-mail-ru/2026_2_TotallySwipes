const SWIPE_THRESHOLD = 120;
const ROTATION_COEF = 0.05;

function clamp01(value) {
    return Math.min(Math.max(value, 0), 1);
}

function setStamps(card, dx, dy) {
    card.style.setProperty('--swipe-like', clamp01(dx / SWIPE_THRESHOLD));
    card.style.setProperty('--swipe-dislike', clamp01(-dx / SWIPE_THRESHOLD));
    card.style.setProperty('--swipe-super', clamp01(-dy / SWIPE_THRESHOLD));
}

function resetCard(card) {
    card.style.transform = '';
    setStamps(card, 0, 0);
}

export function initStack(stackElement, { onSwipe }) {
    let isAnimating = false;
    let drag = null;

    stackElement.addEventListener('pointerdown',(event) => {
        if (isAnimating || event.button !== 0) return;

        if (event.target.closest('.feed__card') !== stackElement.lastElementChild)
            return

        if (!stackElement.lastElementChild) return;

        drag = {
            startX: event.clientX,
            startY: event.clientY,
            card: stackElement.lastElementChild,
        }

        drag.card.setPointerCapture(event.pointerId);
        drag.card.classList.add('feed__card_dragging')
    });

    stackElement.addEventListener('pointermove',(event) => {
        if (!drag) return;
        const dx = event.clientX - drag.startX;
        const dy = event.clientY - drag.startY;

        drag.dx = dx;
        drag.dy = dy;

        drag.card.style.transform = `translate(${dx}px, ${dy}px) rotate(${dx * ROTATION_COEF}deg)`;

        setStamps(drag.card, drag.dx, drag.dy)
    });

    stackElement.addEventListener('pointerup',(event) => {
        if (!drag) return;

        drag.card.classList.remove('feed__card_dragging')

        let direction = '';

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

    stackElement.addEventListener('pointercancel',(event) => {
        if (!drag) return;
        resetCard(drag.card);
        drag.card.classList.remove('feed__card_dragging');
        drag = null;

    });

    function swipe(direction) {
        if (isAnimating) return;
        isAnimating = true;

        const top = stackElement.lastElementChild;

        if (!top) {
            isAnimating = false;
            return;
        }

        top.style.transform = '';
        top.style.setProperty(`--swipe-${direction}`, 1);
        top.classList.add(`feed__card_leaving_${direction}`)

        top.addEventListener('transitionend', () => {
            top.remove();

            stackElement.querySelector('.feed__card_layer_2')?.classList
                .replace('feed__card_layer_2', 'feed__card_layer_1');

            stackElement.querySelector('.feed__card_layer_3')?.classList
                .replace('feed__card_layer_3', 'feed__card_layer_2');

            const html = onSwipe(direction);

            stackElement.insertAdjacentHTML('afterbegin', html)

            isAnimating = false;
        }, { once: true });
    }

    return { swipe }
}