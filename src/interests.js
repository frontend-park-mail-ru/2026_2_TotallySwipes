export const INTERESTS = [
    { label: 'Кофе', icon: 'coffee' },
    { label: 'Книги', icon: 'book' },
    { label: 'Музыка', icon: 'music' },
    { label: 'Походы', icon: 'mountain' },
    { label: 'Велосипед', icon: 'bike' },
    { label: 'Путешествия', icon: 'plane' },
    { label: 'Фотография', icon: 'camera' },
    { label: 'Настолки', icon: 'game' },
    { label: 'Кулинария', icon: 'flame' },
    { label: 'Бег', icon: 'zap' },
    { label: 'Рисование', icon: 'palette' },
    { label: 'Кино', icon: 'star' },
    { label: 'Концерты', icon: 'sparkles' },
    { label: 'Животные', icon: 'heart' },
];

export function interestIconUrl(label) {
    const interest = INTERESTS.find((item) => item.label === label);

    return interest ? `/public/icons/${interest.icon}.svg` : null;
}
