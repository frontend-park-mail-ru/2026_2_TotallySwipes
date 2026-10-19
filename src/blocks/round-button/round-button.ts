import roundButtonHbs from './round-button.hbs';

export interface RoundButtonData {
    type: 'undo' | 'dislike' | 'super' | 'like';
    size: 's' | 'm' | 'l';
    icon: string;
    label: string;
    disabled?: boolean;
}

/**
 * @param button - Данные кнопки, type попадает в модификатор и data-action.
 * @param [mix]
 * @returns HTML кнопки.
 */
export function roundButtonTemplate(button: RoundButtonData, mix = ''): string {
    return roundButtonHbs({
        ...button,
        mix,
    });
}
