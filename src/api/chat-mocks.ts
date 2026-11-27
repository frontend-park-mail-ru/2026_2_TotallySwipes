import type {
    ChatCard,
    ChatDetails,
    ChatLastMessage,
    ChatMessage,
    ChatMessagesPage,
    ChatMessagesParams,
    ChatReadPosition,
    ChatSummary,
} from './api.types.js';

interface MockChat {
    matchId: number;
    peerId: number;
    name: string;
    age: number;
    avatar: string;
    daysAgo: number;
    time: [number, number];
    unreadCount?: number;
    commonTags?: string[];
    message?: { text: string; readByPeer?: boolean } | { duration: number };
    previousText?: string;
    olderMessages?: number;
}

interface MockChatState {
    details: ChatDetails;
    history: ChatMessage[];
}

interface MockMatchProfile {
    match_id: number;
    user_id: number;
    name: string | null;
    age: number | null;
    photo_url: string | null;
    created_at: string;
}

const updatedChats = new Map<string, MockChatState>();
const sentMessages = new Map<string, ChatMessage>();
const mockStartedAt = new Date();

function mockChatKey(userId: number, chatId: string): string {
    return `${userId}:${chatId}`;
}

const PORTRAIT_ALINA = '/img/chat-avatar-alina.png';
const PORTRAIT_SONYA = '/img/chat-avatar-sonya.png';
const PORTRAIT_MARINA = '/img/chat-avatar-marina.png';

const CHATS: MockChat[] = [
    {
        matchId: 99,
        peerId: 201,
        name: 'Алина',
        age: 24,
        avatar: PORTRAIT_ALINA,
        daysAgo: 0,
        time: [18, 42],
        unreadCount: 1,
        message: { text: 'А ты на какой плёнке снимаешь?' },
        previousText: 'На выходных снова взял с собой плёночный фотоаппарат.',
    },
    {
        matchId: 98,
        peerId: 202,
        name: 'Соня',
        age: 25,
        avatar: PORTRAIT_SONYA,
        daysAgo: 0,
        time: [17, 5],
        unreadCount: 1,
        message: { duration: 24 },
    },
    {
        matchId: 96,
        peerId: 204,
        name: 'Катя',
        age: 27,
        avatar: PORTRAIT_ALINA,
        daysAgo: 0,
        time: [15, 30],
        unreadCount: 1,
        message: { text: 'Увидимся в четверг?' },
    },
    {
        matchId: 97,
        peerId: 203,
        name: 'Марина',
        age: 26,
        avatar: PORTRAIT_MARINA,
        daysAgo: 1,
        time: [18, 30],
        message: { text: 'Тогда до субботы!', readByPeer: true },
    },
    {
        matchId: 100,
        peerId: 200,
        name: 'Даша',
        age: 23,
        avatar: PORTRAIT_MARINA,
        daysAgo: 1,
        time: [12, 0],
        commonTags: ['hiking', 'coffee'],
    },
    {
        matchId: 94,
        peerId: 206,
        name: 'Вера',
        age: 22,
        avatar: PORTRAIT_MARINA,
        daysAgo: 3,
        time: [12, 0],
        message: { text: 'Ха-ха, договорились', readByPeer: false },
        olderMessages: 110,
    },
    {
        matchId: 93,
        peerId: 207,
        name: 'Лиза',
        age: 24,
        avatar: PORTRAIT_ALINA,
        daysAgo: 20,
        time: [12, 0],
    },
    {
        matchId: 89,
        peerId: 211,
        name: 'Ника',
        age: 28,
        avatar: PORTRAIT_SONYA,
        daysAgo: 24,
        time: [12, 0],
        message: { text: 'Привет! Тоже люблю джаз', readByPeer: true },
    },
];

export function getMockChatIdForMatch(matchId: number): string {
    const index = CHATS.findIndex((chat) => chat.matchId === matchId);
    return index === -1 ? String(matchId) : String(index + 1);
}

export function createMockChatCards(
    currentUserId: number,
    matches: MockMatchProfile[],
): ChatCard[] {
    const cards = CHATS.map(
        (
            {
                matchId,
                peerId,
                name,
                age,
                avatar,
                daysAgo,
                time,
                unreadCount = 0,
                message,
                previousText,
                olderMessages = 0,
            },
            index,
        ) => {
            const chatId = String(index + 1);
            const updated = updatedChats.get(mockChatKey(currentUserId, chatId));
            if (updated) return updated.details.chat;

            const activity = new Date(mockStartedAt);
            activity.setDate(mockStartedAt.getDate() - daysAgo);
            activity.setHours(...time, 0, 0);
            if (activity >= mockStartedAt) activity.setDate(activity.getDate() - 1);
            const activityAt = activity.toISOString();
            const createdAt = new Date(activity);
            if (message) createdAt.setDate(activity.getDate() - 1);

            let lastMessage: ChatLastMessage | null = null;
            if (message) {
                const isVoice = 'duration' in message;
                const readByPeer = isVoice ? null : (message.readByPeer ?? null);

                lastMessage = {
                    message_id: String(1000 + index),
                    seq: olderMessages + (previousText ? 2 : 1),
                    sender_id: readByPeer === null ? peerId : currentUserId,
                    type: isVoice ? 'voice' : 'text',
                    text_preview: isVoice ? null : message.text,
                    duration_seconds: isVoice ? message.duration : null,
                    created_at: activityAt,
                    is_read_by_peer: readByPeer,
                };
            }

            return {
                chat_id: chatId,
                match_id: matchId,
                peer: { user_id: peerId, name, age, avatar_url: avatar },
                is_new: message === undefined,
                unread_count: unreadCount,
                last_message: lastMessage,
                created_at: createdAt.toISOString(),
                last_activity_at: activityAt,
                version: 1,
            };
        },
    );

    const existingMatches = new Set(cards.map((card) => card.match_id));
    for (const match of matches) {
        if (existingMatches.has(match.match_id)) continue;

        const chatId = getMockChatIdForMatch(match.match_id);
        const updated = updatedChats.get(mockChatKey(currentUserId, chatId));
        const createdAt = new Date(
            Math.min(Date.parse(match.created_at), mockStartedAt.getTime() - 1),
        ).toISOString();
        cards.push(
            updated?.details.chat ?? {
                chat_id: chatId,
                match_id: match.match_id,
                peer: {
                    user_id: match.user_id,
                    name: match.name,
                    age: match.age,
                    avatar_url: match.photo_url,
                },
                is_new: true,
                unread_count: 0,
                last_message: null,
                created_at: createdAt,
                last_activity_at: createdAt,
                version: 1,
            },
        );
    }

    return cards.sort((a, b) => b.last_activity_at.localeCompare(a.last_activity_at));
}

export function summarizeMockChats(chats: ChatCard[]): ChatSummary {
    return {
        new_chats_count: chats.filter((chat) => chat.is_new).length,
        unread_chats_count: chats.filter((chat) => chat.unread_count > 0).length,
        unread_messages_count: chats.reduce((count, chat) => count + chat.unread_count, 0),
        version: chats.reduce((version, chat) => version + chat.version - 1, 1),
    };
}

export function createMockChatDetails(chat: ChatCard, currentUserId: number): ChatDetails {
    const updated = updatedChats.get(mockChatKey(currentUserId, chat.chat_id));
    if (updated) return updated.details;

    const { last_message: lastMessage } = chat;
    const fixture = CHATS.find((item) => item.matchId === chat.match_id);

    return {
        chat,
        is_empty: lastMessage === null,
        common_tags: fixture?.commonTags ?? [],
        last_read_seq: (lastMessage?.seq ?? 0) - chat.unread_count,
        peer_last_read_seq: lastMessage?.is_read_by_peer ? lastMessage.seq : 0,
        messaging: { can_send: true, restriction: null },
    };
}

function getMockChatHistory(chat: ChatCard, currentUserId: number): ChatMessage[] {
    const updated = updatedChats.get(mockChatKey(currentUserId, chat.chat_id));
    if (updated) return updated.history;

    const lastMessage = chat.last_message;
    const items: ChatMessage[] = [];

    if (lastMessage) {
        const message: ChatMessage = {
            message_id: lastMessage.message_id,
            seq: lastMessage.seq,
            sender_id: lastMessage.sender_id,
            type: lastMessage.type,
            text: lastMessage.text_preview,
            attachment: null,
            created_at: lastMessage.created_at,
            edited_at: null,
            deleted_at: null,
            version: 1,
        };
        const fixture = CHATS.find((item) => item.matchId === chat.match_id);
        const { previousText, olderMessages = 0 } = fixture ?? {};

        for (let seq = 1; seq <= olderMessages; seq += 1) {
            const createdAt = new Date(
                Date.parse(message.created_at) - (message.seq - seq) * 600_000,
            );
            items.push({
                ...message,
                seq,
                message_id: `mock-${chat.chat_id}-older-${seq}`,
                sender_id: seq % 2 === 0 ? currentUserId : chat.peer.user_id,
                type: 'text',
                text: `Сообщение из истории ${seq}`,
                created_at: createdAt.toISOString(),
            });
        }

        if (previousText) {
            const previousTime = new Date(message.created_at);
            previousTime.setMinutes(previousTime.getMinutes() - 5);
            items.push({
                ...message,
                message_id: `mock-${chat.chat_id}-1`,
                seq: message.seq - 1,
                sender_id: currentUserId,
                type: 'text',
                text: previousText,
                created_at: previousTime.toISOString(),
            });
        }

        items.push(message);
    }

    return items;
}

export function getMockChatMessagesPage(
    chat: ChatCard,
    userId: number,
    { limit = 50, before_seq, after_seq }: ChatMessagesParams,
): ChatMessagesPage {
    const history = getMockChatHistory(chat, userId);
    const newer = after_seq !== undefined;
    const candidates = newer
        ? history.filter((message) => message.seq > after_seq)
        : history.filter((message) => before_seq === undefined || message.seq < before_seq);
    const items = newer ? candidates.slice(0, limit) : candidates.slice(-limit);
    const hasMore = candidates.length > items.length;
    const boundary = newer ? items.at(-1) : items[0];

    return {
        items,
        direction: newer ? 'newer' : 'older',
        next_cursor: hasMore && boundary ? boundary.seq : null,
        has_more: hasMore,
    };
}

export function markMockChatSeen(chat: ChatCard, userId: number) {
    if (!chat.is_new) return;

    updatedChats.set(mockChatKey(userId, chat.chat_id), {
        details: {
            ...createMockChatDetails(chat, userId),
            chat: { ...chat, is_new: false, version: chat.version + 1 },
        },
        history: getMockChatHistory(chat, userId),
    });
}

export function markMockChatRead(chat: ChatCard, userId: number, seq: number): ChatReadPosition {
    const details = createMockChatDetails(chat, userId);
    const lastReadSeq = Math.max(details.last_read_seq, Math.min(seq, chat.last_message?.seq ?? 0));
    if (lastReadSeq > details.last_read_seq) {
        const history = getMockChatHistory(chat, userId);
        const unreadCount = history.filter(
            (message) =>
                message.seq > lastReadSeq &&
                message.sender_id !== userId &&
                message.sender_id !== null,
        ).length;
        updatedChats.set(mockChatKey(userId, chat.chat_id), {
            details: {
                ...details,
                last_read_seq: lastReadSeq,
                chat: { ...chat, unread_count: unreadCount, version: chat.version + 1 },
            },
            history,
        });
    }

    return { chat_id: chat.chat_id, user_id: userId, last_read_seq: lastReadSeq };
}

export function appendMockChatMessage(
    chat: ChatCard,
    userId: number,
    text: string,
    clientMessageId: string,
): ChatMessage {
    const key = JSON.stringify([userId, chat.chat_id, clientMessageId]);
    const sent = sentMessages.get(key);
    if (sent) return { ...sent };

    const details = createMockChatDetails(chat, userId);
    const history = getMockChatHistory(chat, userId);
    const { chat: currentChat } = details;
    const seq = (currentChat.last_message?.seq ?? 0) + 1;
    const createdAt = new Date(Math.max(Date.now(), Date.parse(currentChat.last_activity_at) + 1));
    const message: ChatMessage = {
        message_id: `mock-sent-${userId}-${chat.chat_id}-${seq}`,
        seq,
        sender_id: userId,
        type: 'text',
        text,
        attachment: null,
        created_at: createdAt.toISOString(),
        edited_at: null,
        deleted_at: null,
        version: 1,
    };

    updatedChats.set(mockChatKey(userId, chat.chat_id), {
        history: [...history, message],
        details: {
            ...details,
            is_empty: false,
            chat: {
                ...currentChat,
                last_activity_at: message.created_at,
                version: currentChat.version + 1,
                last_message: {
                    message_id: message.message_id,
                    seq: message.seq,
                    sender_id: message.sender_id,
                    type: message.type,
                    text_preview: text,
                    duration_seconds: null,
                    created_at: message.created_at,
                    is_read_by_peer: false,
                },
            },
        },
    });

    sentMessages.set(key, message);
    return { ...message };
}
