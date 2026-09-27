import { loginFormTemplate, initLoginForm } from '../login-form/login-form.js';

export function renderAuthPage(root, { onLogin }) {
    root.innerHTML = Handlebars.templates['auth/auth']({
        form: loginFormTemplate(),
    });

    initLoginForm(root.querySelector('.login-form'), { onSuccess: onLogin });
}
