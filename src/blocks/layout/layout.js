import { sidebarTemplate, loadSidebarUser, initSidebarLogout } from '../sidebar/sidebar.js';

export function renderLayout(root) {
    root.innerHTML = Handlebars.templates['layout/layout']({
        sidebar: sidebarTemplate('layout__sidebar'),
    });

    const sidebar = root.querySelector('.sidebar');
    loadSidebarUser(sidebar);
    initSidebarLogout(sidebar);

    return root.querySelector('.layout__main');
}

export function withLayout(renderPage) {
    return (root, router) => {
        let main = root.querySelector('.layout__main');

        if (main) {
            main.replaceChildren();
        } else {
            main = renderLayout(root);
        }

        renderPage(main, router);
    };
}
