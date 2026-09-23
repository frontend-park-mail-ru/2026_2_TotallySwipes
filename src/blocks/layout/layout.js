import { sidebarTemplate, loadSidebarUser } from '../sidebar/sidebar.js';

export function renderLayout(root) {
    root.innerHTML = `
        <div class="layout">
            ${sidebarTemplate('layout__sidebar')}
            <main class="layout__main"></main>
        </div>
    `;

    loadSidebarUser(root.querySelector('.sidebar'));

    return root.querySelector('.layout__main');
}
