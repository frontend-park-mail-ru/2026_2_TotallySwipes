import { setFormFieldError } from '../form-field/form-field.js';
import { chipsTemplate } from '../chips/chips.js';
import { interestIcons } from './interest-icons.js';
import { INTERESTS_MAX_COUNT, validateInterestsCount } from '../../validation.js';


const ACCENTS = ['mint', 'sun', 'pink', 'sky', 'lilac'];

const INTERESTS = [
    { label: 'Кофе', icon: 'coffee' },
    { label: 'Книги', icon: 'books' },
    { label: 'Музыка', icon: 'music' },
    { label: 'Походы', icon: 'hiking' },
    { label: 'Велосипед', icon: 'bicycle' },
    { label: 'Путешествия', icon: 'travel' },
    { label: 'Фотография', icon: 'photography' },
    { label: 'Настолки', icon: 'boardgames' },
    { label: 'Кулинария', icon: 'cooking' },
    { label: 'Бег', icon: 'running' },
    { label: 'Рисование', icon: 'drawing' },
    { label: 'Кино', icon: 'movies' },
    { label: 'Концерты', icon: 'concerts' },
    { label: 'Животные', icon: 'animals' },
];

// Шаг 5: Интересы. Сохраняет в data: interests -- массив подписей (на бэкенд уходят как tags).
// Интересы необязательны, поэтому validate нет.
export const interestsStep = {
    template() {
        const options = INTERESTS.map(({ label, icon }, index) => ({
            value: label,
            label,
            icon: interestIcons[icon],
            accent: ACCENTS[index % ACCENTS.length],
        }));

        return Handlebars.templates['register-interests/register-interests']({
            chips: chipsTemplate({ type: 'checkbox', name: 'interests', options, mix: 'chips_stickers' }),
            max: INTERESTS_MAX_COUNT,
        });
    },

    init(form, data) {
        const checkboxes = [...form.querySelectorAll('.chips__input')];
        const counter = form.querySelector('.register-interests__count');
        const errorAnchor = checkboxes[0];

        const selected = () => checkboxes.filter((checkbox) => checkbox.checked);
        const sync = () => {
            data.interests = selected().map((checkbox) => checkbox.value);
            counter.textContent = data.interests.length;
        };

        checkboxes.forEach((checkbox) => {
            checkbox.checked = (data.interests ?? []).includes(checkbox.value);
        });
        sync();

        form.addEventListener('change', (event) => {
            if (!event.target.matches('.chips__input')) {
                return;
            }

            const error = validateInterestsCount(selected().length);

            if (error) {
                event.target.checked = false;
            }

            setFormFieldError(errorAnchor, error);

            sync();
        });
    },
};
