import { sidebarTemplate, loadSidebarUser } from '../sidebar/sidebar.js';

export function renderLayout(root) {
    root.innerHTML = Handlebars.templates['layout/layout']({
        sidebar: sidebarTemplate('layout__sidebar'),
    });

    loadSidebarUser(root.querySelector('.sidebar'));

    return root.querySelector('.layout__main');
}
