import type { ProfileShort, SwipeAction, uuid } from '../api/api.types.js';
import { read, remove, write } from './storage.js';

export interface Decision {
    id: number;
    direction: Exclude<SwipeAction, 'super'>;
}

type UserId = ProfileShort['user_id'];

function draftKey(userId: UserId, searchId: uuid): string {
    return `place-search-draft:${userId}:${searchId}`;
}

export function saveDraft(userId: UserId, searchId: uuid, draft: Decision[]): void {
    write(draftKey(userId, searchId), draft);
}

export function loadDraft(userId: UserId, searchId: uuid): Decision[] | null {
    const draft = read<Decision[]>(draftKey(userId, searchId));
    return Array.isArray(draft) ? draft : null;
}

export function clearDraft(userId: UserId, searchId: uuid): void {
    remove(draftKey(userId, searchId));
}
