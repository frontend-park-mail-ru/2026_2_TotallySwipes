import { loginFormTemplate, initLoginForm } from '../login-form/login-form.js';
import { registerFormTemplate, initRegisterForm } from '../register-form/register-form.js';

function renderAuthShell(root, { activeTab, form }) {
    root.innerHTML = Handlebars.templates['auth/auth']({
        form,
        isLogin: activeTab === 'login',
        isRegister: activeTab === 'register',
    });
}

export function renderAuthPage(root, { onLogin }) {
    renderAuthShell(root, { activeTab: 'login', form: loginFormTemplate() });

    initLoginForm(root.querySelector('.login-form'), { onSuccess: onLogin });
}

export function renderRegisterPage(root, { onRegistered } = {}) {
    renderAuthShell(root, { activeTab: 'register', form: registerFormTemplate() });

    initRegisterForm(root.querySelector('.register-form'), { onRegistered });
}
