/**
 * Показывает модальное окно и удаляет его после закрытия.
 *
 * @param {Object} params
 * @param {string} [params.image] - Путь к картинке.
 * @param {string} params.title
 * @param {string} params.text
 * @param {string} [params.buttonText='Ок']
 * @param {string} [params.cancelText] - Текст второй кнопки. Без него кнопка одна.
 * @param {function(string): void} [params.onClose] - Получает returnValue диалога:
 *     'confirm' или 'cancel'.
 */
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
