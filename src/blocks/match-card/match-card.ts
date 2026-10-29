import type { MatchData } from '../matches/matches.js';
import { pillTemplate, type PillProps } from '../pill/pill.js';
import matchCardHbs from './match-card.hbs';

const NEW_PILL: PillProps = {
    text: 'Новая',
    icon: null,
    color: 'pink',
    size: 'xs',
    mix: 'match-card__new',
};

export function matchCardTemplate(mix: string, match: MatchData) {
    return matchCardHbs({
        mix: mix,
        ...match,
        newPill: match.isNew ? pillTemplate(NEW_PILL) : '',
    });
}
