import type { MatchData } from '../matches/matches.js';
import { pillTemplate } from '../pill/pill.js';
import matchCardHbs from './match-card.hbs';

const NEW_PILL = { text: 'Новая', icon: null, color: 'pink', size: 'xs' };

export function matchCardTemplate(mix: string, match: MatchData) {
    return matchCardHbs({
        mix: mix,
        ...match,
        newPill: match.isNew ? pillTemplate(NEW_PILL, 'match-card__new') : '',
    });
}
