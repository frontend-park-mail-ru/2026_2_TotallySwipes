export function showModal({ image, title, text, buttonText = 'Ок', onClose }) {
    document.body.insertAdjacentHTML(
        'beforeend',
        Handlebars.templates['modal/modal']({ image, title, text, buttonText }),
    );

    const modal = document.body.lastElementChild;
    modal.addEventListener('close', () => {
        modal.remove();
        onClose?.();
    });
    modal.showModal();
}
