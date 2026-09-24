export function renderFeedPage(root) {
    const page = document.createElement('section');
    page.className = 'feed';

    page.innerHTML = `
        <h1 class="feed__title">Анкеты</h1>
        <div class="feed__cards"></div>
    `;

    // TODO: здесь будет карточка анкеты (блок profile-card) и кнопки лайк/дизлайк

    root.append(page);
}
