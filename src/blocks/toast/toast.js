const DEFAULT_DURATION_MS = 5000;

let container = null;

function getContainer() {
    if (!container?.isConnected) {
        container = document.createElement('div');
        container.className = 'toasts';
        document.body.append(container);
    }

    return container;
}

export function showToast(message, duration = DEFAULT_DURATION_MS) {
    const wrapper = document.createElement('div');
    wrapper.innerHTML = Handlebars.templates['toast/toast']({ message });

    const toast = wrapper.firstElementChild;
    toast.style.setProperty('--toast-duration', `${duration}ms`);

    const timerId = setTimeout(hide, duration);

    function hide() {
        clearTimeout(timerId);
        toast.classList.add('toast_hiding');
    }

    toast.querySelector('.toast__close').addEventListener('click', hide);
    toast.addEventListener('animationend', (event) => {
        if (event.animationName === 'toast-out') {
            toast.remove();
        }
    });

    getContainer().append(toast);
}
