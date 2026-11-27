import type { ChatSummary } from './api/api.types.js';

export function createChatSummary() {
    let currentSummary: ChatSummary | undefined;

    function applyChatSummary(summary: ChatSummary): boolean {
        if (currentSummary && summary.version <= currentSummary.version) {
            return false;
        }

        currentSummary = summary;
        return true;
    }

    function getUnreadChatCount() {
        return currentSummary ? currentSummary.unread_chats_count : 0;
    }

    function clear() {
        currentSummary = undefined;
    }

    return { applyChatSummary, getUnreadChatCount, clear };
}
