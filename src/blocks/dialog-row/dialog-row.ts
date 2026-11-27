import type { ChatCard, ChatLastMessage } from '../../api/api.types.js';
import { padWithZeros } from '../../utils/format.js';
import dialogRowHbs from './dialog-row.hbs';

const timeFormat = new Intl.DateTimeFormat('ru', { hour: '2-digit', minute: '2-digit' });
const weekdayFormat = new Intl.DateTimeFormat('ru', { weekday: 'short' });
const dayFormat = new Intl.DateTimeFormat('ru', { day: 'numeric', month: 'short' });
const yearFormat = new Intl.DateTimeFormat('ru', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
});

function activityLabel(value: string, now: Date): string {
    const activity = new Date(value);
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);
    const recent = new Date(today);
    recent.setDate(today.getDate() - 6);

    if (activity >= today) return timeFormat.format(activity);
    if (activity >= yesterday) return 'Вчера';
    if (activity >= recent) {
        const weekday = weekdayFormat.format(activity);
        return weekday.charAt(0).toUpperCase() + weekday.slice(1);
    }
    if (activity.getFullYear() !== today.getFullYear()) return yearFormat.format(activity);
    return dayFormat.format(activity).replace(/\.$/, '');
}

function messagePreview(message: ChatLastMessage | null): string {
    if (!message) return 'Начните разговор';

    if (message.type === 'voice' || message.type === 'video_note') {
        const label = message.type === 'voice' ? 'Голосовое сообщение' : 'Кружочек';
        if (message.duration_seconds === null) return label;

        const duration = Math.floor(message.duration_seconds);
        return `${label}, ${Math.floor(duration / 60)}:${padWithZeros(duration % 60)}`;
    }

    return message.text_preview ?? 'Сообщение';
}

export function dialogRowTemplate(card: ChatCard, currentUserId: number, now: Date): string {
    const { peer, last_message: message } = card;
    const name = peer.name ?? 'Собеседник';
    const isRead = message?.is_read_by_peer === true;

    return dialogRowHbs({
        href: `/messages/${encodeURIComponent(card.chat_id)}`,
        chatId: card.chat_id,
        name,
        age: peer.age,
        avatarUrl: peer.avatar_url,
        initial: name.charAt(0),
        unreadCount: card.unread_count,
        isNew: card.is_new,
        activityAt: card.last_activity_at,
        activityLabel: activityLabel(card.last_activity_at, now),
        preview: messagePreview(message),
        isVoice: message?.type === 'voice',
        isOutgoing: message?.sender_id === currentUserId,
        isRead,
        statusLabel: isRead ? 'Прочитано' : 'Отправлено',
    });
}
