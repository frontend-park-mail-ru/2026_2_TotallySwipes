import { setFormFieldError } from '../form-field/form-field.js';
import { chipsTemplate } from '../chips/chips.js';
import type { AccentColor } from '../../colors.js';
import { INTERESTS_MAX_COUNT, validateInterestsCount } from '../../validation.js';
import { INTERESTS, interestIconUrl } from '../../interests.js';
import { updateProfile } from '../../api/api.js';
import { asOption, getElement } from '../../utils/dom.js';
import type { RegisterStepLogic } from '../register-form/register-form.js';
import registerInterestsHbs from './register-interests.hbs';

const ACCENTS: readonly AccentColor[] = ['mint', 'sun', 'pink', 'sky', 'lilac'];

const INTEREST_KEYS = INTERESTS.map(({ key }) => key);

/**
 * Шаг регистрации: интересы. Интересы необязательны, поэтому validate нет;
 * отправка заменяет теги анкеты.
 */
export const interestsStep: RegisterStepLogic = {
    template() {
        const chips = INTERESTS.map(({ key, label }, index) => ({
            value: key,
            text: label,
            icon: interestIconUrl(key),
            color: ACCENTS[index % ACCENTS.length],
        }));

        return registerInterestsHbs({
            chips: chipsTemplate({
                type: 'checkbox',
                name: 'interests',
                chips,
                mix: 'chips_stickers',
            }),
            max: INTERESTS_MAX_COUNT,
        });
    },

    init(form, data) {
        const checkboxes = [...form.querySelectorAll<HTMLInputElement>('.chips__input')];
        const counter = getElement(form, '.register-interests__count');
        const errorAnchor = checkboxes[0];

        const selected = () => checkboxes.filter((checkbox) => checkbox.checked);
        const sync = () => {
            data.interests = selected()
                .map((checkbox) => asOption(INTEREST_KEYS, checkbox.value))
                .filter((key) => key !== undefined);
            counter.textContent = String(data.interests.length);
        };

        const saved: readonly string[] = data.interests ?? [];

        checkboxes.forEach((checkbox) => {
            checkbox.checked = saved.includes(checkbox.value);
        });
        sync();

        form.addEventListener('change', (event) => {
            const checkbox = event.target;

            if (!(checkbox instanceof HTMLInputElement) || !checkbox.matches('.chips__input')) {
                return;
            }

            const error = validateInterestsCount(selected().length);

            if (error) {
                checkbox.checked = false;
            }

            setFormFieldError(errorAnchor, error);

            sync();
        });
    },

    async submit(form, data) {
        await updateProfile({ tags: data.interests ?? [] });
        return true;
    },
};
