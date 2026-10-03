import { loginFormTemplate, initLoginForm } from '../login-form/login-form.js';
import { pillTemplate } from '../pill/pill.js';

const PILLS = [
    {
        text: 'Тест совместимости',
        color: 'lilac',
        icon: '/public/icons/sparkles.svg',
        mix: 'auth__pill auth__pill_test',
    },
    {
        text: 'Анкеты рядом',
        color: 'sky',
        icon: '/public/icons/pin.svg',
        mix: 'auth__pill auth__pill_nearby',
    },
    {
        text: 'Взаимные симпатии',
        color: 'pink',
        icon: '/public/icons/heart.svg',
        mix: 'auth__pill auth__pill_matches',
    },
];

export function renderAuthPage(root, { onLogin }) {
    root.innerHTML = Handlebars.templates['auth/auth']({
        pills: PILLS.map(({ mix, ...pill }) => pillTemplate(pill, mix)).join(''),
        form: loginFormTemplate(),
    });

    initLoginForm(root.querySelector('.login-form'), { onSuccess: onLogin });
}
