export function showModal({ image, title, text, buttonText = 'Ок', cancelText, onClose }) {
    document.body.insertAdjacentHTML(
        'beforeend',
        Handlebars.templates['modal/modal']({ image, title, text, buttonText, cancelText }),
    );

    const modal = document.body.lastElementChild;
    modal.addEventListener('close', () => {
        modal.remove();
        onClose?.(modal.returnValue);
    });
    modal.showModal();
}
