import emptyStateHbs from './empty-state.hbs';

export interface EmptyStateAction {
    text: string;
    view: 'primary' | 'outline' | 'ghost';
    href?: string;
    action?: string;
    icon?: string;
    disabled?: boolean;
}

export interface EmptyStateData {
    image: string;
    title: string;
    text: string;
    actions: EmptyStateAction[];
    size?: 'l';
    sticker?: boolean;
    mix?: string;
}

/**
 * Рендерит блок "Пустое состояние": картинка, заголовок, текст и кнопки.
 *
 * @param props - Свойства для рендеринга.
 * @returns HTML-строка блока.
 */
export function emptyStateTemplate(props: EmptyStateData): string {
    return emptyStateHbs(props);
}
