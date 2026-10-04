export const INTERESTS = [
    { label: 'кофе', icon: 'coffee' },
    { label: 'книги', icon: 'book' },
    { label: 'музыка', icon: 'music' },
    { label: 'походы', icon: 'mountain' },
    { label: 'велосипед', icon: 'bike' },
    { label: 'путешествия', icon: 'plane' },
    { label: 'фотография', icon: 'camera' },
    { label: 'настолки', icon: 'game' },
    { label: 'кулинария', icon: 'flame' },
    { label: 'бег', icon: 'zap' },
    { label: 'рисование', icon: 'palette' },
    { label: 'кино', icon: 'star' },
    { label: 'концерты', icon: 'sparkles' },
    { label: 'животные', icon: 'heart' },
];

export function interestIconUrl(label) {
    const interest = INTERESTS.find((item) => item.label === label);

    return interest ? `/public/icons/${interest.icon}.svg` : null;
}
