import { loginFormTemplate, initLoginForm } from '../login-form/login-form.js';
import type { LoginFormProps } from '../login-form/login-form.js';
import { registerFormTemplate, initRegisterForm } from '../register-form/register-form.js';
import type { RegisterFormProps } from '../register-form/register-form.js';
import { pillTemplate } from '../pill/pill.js';
import type { PillProps } from '../pill/pill.js';
import { getElement } from '../../utils/dom.js';
import authHbs from './auth.hbs';

const PILLS: PillProps[] = [
    {
        icon: '/icons/sparkles.svg',
        text: 'Тест совместимости',
        color: 'lilac',
        mix: 'auth__pill auth__pill_test',
    },
    {
        icon: '/icons/pin.svg',
        text: 'Анкеты рядом',
        color: 'sky',
        mix: 'auth__pill auth__pill_nearby',
    },
    {
        icon: '/icons/heart.svg',
        text: 'Взаимные симпатии',
        color: 'pink',
        mix: 'auth__pill auth__pill_matches',
    },
];

/**
 * Вкладки общей оболочки страниц входа и регистрации: `login` - вход,
 * `register` - регистрация.
 */
type AuthTab = 'login' | 'register';

/**
 * Свойства общей оболочки страниц входа и регистрации.
 */
interface AuthShellProps {
    /** Вкладка, подсвечивающаяся как активная. */
    activeTab: AuthTab;
    /** HTML-строка формы. */
    form: string;
}

/**
 * Рендерит общую оболочку страниц входа и регистрации.
 *
 * @param root - Контейнер страницы.
 * @param props - Свойства общей оболочки страниц входа и регистрации для рендеринга.
 */
function renderAuthShell(root: HTMLElement, props: AuthShellProps): void {
    root.innerHTML = authHbs({
        pills: PILLS.map(pillTemplate).join(''),
        form: props.form,
        isLogin: props.activeTab === 'login',
        isRegister: props.activeTab === 'register',
    });
}

/**
 * Рендерит страницу входа.
 *
 * @param root - Контейнер страницы.
 * @param props - Свойства формы входа.
 */
export function renderLoginPage(root: HTMLElement, props: LoginFormProps): void {
    renderAuthShell(root, { activeTab: 'login', form: loginFormTemplate() });

    initLoginForm(getElement(root, '.login-form'), props);
}

/**
 * Рендерит страницу регистрации.
 *
 * @param root - Контейнер страницы.
 * @param props - Свойства формы регистрации.
 */
export function renderRegisterPage(root: HTMLElement, props: RegisterFormProps = {}): void {
    renderAuthShell(root, { activeTab: 'register', form: registerFormTemplate() });

    initRegisterForm(getElement(root, '.register-form'), props);
}
