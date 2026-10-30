import { pillTemplate, type PillProps } from '../pill/pill.js';
import matchCardHbs from './match-card.hbs';

export interface MatchCardData {
    matchId: number;
    userId: number;
    name: string;
    age: number;
    imgPath: string;
    compatibility: number | null;
    hasCompatibility: boolean;
    matchColor: string;
    isNew: boolean;
    offset: number;
}

const NEW_PILL: PillProps = {
    text: 'Новая',
    icon: null,
    color: 'pink',
    size: 'xs',
    mix: 'match-card__new',
};

export function matchCardTemplate(mix: string, match: MatchCardData) {
    return matchCardHbs({
        mix: mix,
        ...match,
        newPill: match.isNew ? pillTemplate(NEW_PILL) : '',
    });
}
