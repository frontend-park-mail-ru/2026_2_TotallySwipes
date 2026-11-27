import type { ChatCard, ChatDetails, ChatMessage } from '../../api/api.types.js';
import type { AccentColor } from '../../colors.js';
import { interestColor, interestIconUrl, interestLabel } from '../../interests.js';
import { getElement } from '../../utils/dom.js';
import chatComposerHbs from '../chat-composer/chat-composer.hbs';
import chatMessageHbs from '../chat-message/chat-message.hbs';
import { pillTemplate } from '../pill/pill.js';
import chatBodyHbs from './__body/chat__body.hbs';
import chatHbs from './chat.hbs';

const interestColors = new Map<string, AccentColor>([
    ['hiking', 'sun'],
    ['coffee', 'lilac'],
]);

const mediaLabels: Partial<Record<ChatMessage['type'], string>> = {
    voice: 'Голосовое сообщение',
    video_note: 'Кружочек',
};

const timeFormat = new Intl.DateTimeFormat('ru', { hour: '2-digit', minute: '2-digit' });

interface ChatViewState {
    details?: ChatDetails;
    preview?: ChatCard;
    notice?: string;
    canRetryLoad?: boolean;
    messages?: ChatMessage[];
    hasOlderMessages?: boolean;
}

function chatMessageTemplate(
    message: ChatMessage,
    userId: number,
    peerLastReadSeq: number,
): string {
    const isOutgoing = message.sender_id === userId;
    const isIncoming = message.sender_id !== null && !isOutgoing;
    const isRead = message.seq <= peerLastReadSeq;
    const direction = isOutgoing ? 'out' : 'in';

    return chatMessageHbs({
        text: message.text ?? mediaLabels[message.type] ?? 'Сообщение недоступно',
        timestamp: message.created_at,
        time: timeFormat.format(new Date(message.created_at)),
        seq: message.seq,
        isOutgoing,
        isIncoming,
        isRead,
        statusLabel: isRead ? 'Прочитано' : 'Отправлено',
        mix: `chat-history__message chat-history__message_direction_${direction}`,
    });
}

function chatBodyTemplate(
    { details, notice, canRetryLoad, messages }: ChatViewState,
    userId: number,
): string {
    if (!details) return chatBodyHbs({ notice, canRetryLoad });

    const interests = details.is_empty
        ? details.common_tags
              .map((tag) =>
                  pillTemplate({
                      color: interestColors.get(tag) ?? interestColor(tag),
                      icon: interestIconUrl(tag),
                      text: interestLabel(tag),
                      size: 'l',
                      mix: 'chat__interest',
                  }),
              )
              .join('')
        : '';

    const bubbles = (messages ?? []).map((message) =>
        chatMessageTemplate(message, userId, details.peer_last_read_seq),
    );

    return chatBodyHbs({
        hasDetails: true,
        isEmpty: details.is_empty,
        interests,
        bubbles,
    });
}

function initChatHeader(header: HTMLElement) {
    const profileLink = getElement<HTMLAnchorElement>(header, '.chat__peer');
    const actions = getElement(header, '.chat__actions');
    const meetingLink = getElement<HTMLAnchorElement>(header, '.chat__meeting');
    const photo = getElement<HTMLImageElement>(header, '.chat__photo');
    const initial = getElement(header, '.chat__initial');
    const nameText = getElement(header, '.chat__name-text');
    const ageText = getElement(header, '.chat__age');

    return (chat: ChatCard | undefined) => {
        header.classList.toggle('chat__header_empty', !chat);
        profileLink.hidden = !chat;
        actions.hidden = !chat;
        if (!chat) return;

        const { peer, match_id: matchId } = chat;
        const name = peer.name ?? 'Собеседник';
        profileLink.href = `/profile/${peer.user_id}`;
        meetingLink.href = `/matches/${matchId}/places`;
        nameText.textContent = name;
        ageText.textContent = peer.age === null ? '' : `,\u00a0${peer.age}`;
        ageText.hidden = peer.age === null;
        initial.textContent = name.charAt(0);
        initial.hidden = Boolean(peer.avatar_url);
        photo.hidden = !peer.avatar_url;
        if (peer.avatar_url && photo.getAttribute('src') !== peer.avatar_url) {
            photo.src = peer.avatar_url;
        }
    };
}

export function chatTemplate(): string {
    return chatHbs({ body: chatBodyHbs({}), composer: chatComposerHbs() });
}

export function initChatPanel(
    panel: HTMLElement,
    userId: number,
    onVisibleRead: (chatId: string, seq: number) => void,
    onLoadOlderMessages: () => void,
    onRetry: (messageId: string) => void,
    onRetryLoad: () => void,
) {
    const header = getElement(panel, '.chat__header');
    const updateHeader = initChatHeader(header);
    const body = getElement(panel, '.chat__body');
    const historyButton = getElement<HTMLButtonElement>(panel, '.chat__load-more');
    const composer = getElement(panel, '.chat__composer');
    const input = getElement<HTMLInputElement>(composer, '.chat-composer__input');
    let currentChatId: string | undefined;
    let currentDetails: ChatDetails | undefined;
    let hasOlderMessages = false;
    let renderedMessageIds = new Set<string>();
    const listeners = new AbortController();

    function checkVisibleRead() {
        if (!currentDetails || !panel.isConnected || document.hidden || listeners.signal.aborted)
            return;

        const viewport = body.getBoundingClientRect();
        const top = Math.max(viewport.top, 0);
        const bottom = Math.min(viewport.bottom, window.innerHeight);
        let seq = 0;
        for (const message of body.querySelectorAll<HTMLElement>('[data-incoming][data-seq]')) {
            const bounds = message.getBoundingClientRect();
            if (bounds.width > 0 && bounds.bottom > top && bounds.bottom <= bottom) {
                seq = Math.max(seq, Number(message.dataset.seq));
            }
        }
        if (seq > 0) onVisibleRead(currentDetails.chat.chat_id, seq);
    }

    function updateHistoryButtonVisibility() {
        historyButton.hidden = !hasOlderMessages || body.scrollTop > 1;
    }

    function updateViewport() {
        updateHistoryButtonVisibility();
        checkVisibleRead();
    }

    const readListenerOptions = { passive: true, signal: listeners.signal };
    const viewport = window.visualViewport;
    if (viewport) {
        const resizeChat = () => {
            const wasAtEnd = body.scrollHeight - body.scrollTop - body.clientHeight <= 1;
            if (viewport.scale === 1) {
                panel.style.setProperty('--chat-viewport-height', `${viewport.height}px`);
            } else {
                panel.style.removeProperty('--chat-viewport-height');
            }
            if (wasAtEnd) body.scrollTop = body.scrollHeight;
            updateViewport();
        };
        viewport.addEventListener('resize', resizeChat, readListenerOptions);
        resizeChat();
    }
    body.addEventListener('scroll', updateViewport, readListenerOptions);
    historyButton.addEventListener('click', onLoadOlderMessages, { signal: listeners.signal });
    window.addEventListener('scroll', checkVisibleRead, readListenerOptions);
    window.addEventListener('resize', updateViewport, readListenerOptions);
    document.addEventListener('visibilitychange', checkVisibleRead, readListenerOptions);

    body.addEventListener(
        'click',
        (event) => {
            if (!(event.target instanceof Element)) return;

            if (event.target.closest('.chat__retry-load')) {
                onRetryLoad();
                return;
            }

            const button = event.target.closest('.chat-message__retry');
            const bubble = button?.closest<HTMLElement>('.chat-message');
            const messageId = bubble?.dataset.messageId;
            if (messageId) onRetry(messageId);
        },
        { signal: listeners.signal },
    );

    function dispose() {
        listeners.abort();
    }

    function updatePeerReadPosition(peerId: number, seq: number) {
        if (!currentDetails || currentDetails.chat.peer.user_id !== peerId) return;
        if (seq <= currentDetails.peer_last_read_seq) return;

        currentDetails = { ...currentDetails, peer_last_read_seq: seq };
        for (const message of body.querySelectorAll<HTMLElement>('.chat-message[data-seq]')) {
            if (Number(message.dataset.seq) > seq) continue;

            const status = message.querySelector(
                '.chat-message__status:not(.chat-message__status_read)',
            );
            if (!status) continue;

            status.classList.add('chat-message__status_read');
            status.setAttribute('aria-label', 'Прочитано');
        }
    }

    function updateChat(state: ChatViewState = {}) {
        const { details, preview, messages = [] } = state;
        currentDetails = details;
        const chat = details?.chat ?? preview;
        if (currentChatId !== chat?.chat_id) {
            currentChatId = chat?.chat_id;
            input.value = '';
        }

        updateHeader(chat);
        composer.hidden = !chat;
        input.readOnly = !details;
        input.disabled = details?.messaging.can_send === false;
        hasOlderMessages = state.hasOlderMessages === true;
        updateHistoryButton('ready');

        const messageIds = new Set<string>();
        const uniqueMessages = messages.filter(({ message_id }) => {
            if (messageIds.has(message_id)) return false;

            messageIds.add(message_id);
            return true;
        });
        body.innerHTML = chatBodyTemplate({ ...state, messages: uniqueMessages }, userId);
        renderedMessageIds = messageIds;
        body.scrollTop = details ? body.scrollHeight : 0;
        updateHistoryButtonVisibility();
    }

    function updateHistoryButton(state: 'loading' | 'ready' | 'retry') {
        historyButton.disabled = state === 'loading';
        historyButton.textContent = {
            loading: 'Загрузка истории…',
            ready: 'Загрузить ещё',
            retry: 'Повторить загрузку истории',
        }[state];
    }

    function prependMessages(messages: ChatMessage[], hasMore: boolean) {
        const history = body.querySelector('.chat-history');
        if (!currentDetails || !history) return;

        const bubbles: string[] = [];
        for (const message of messages) {
            if (renderedMessageIds.has(message.message_id)) continue;

            bubbles.push(chatMessageTemplate(message, userId, currentDetails.peer_last_read_seq));
            renderedMessageIds.add(message.message_id);
        }

        if (bubbles.length > 0) {
            const firstMessage = history.firstElementChild;
            const previousTop = firstMessage?.getBoundingClientRect().top;
            history.insertAdjacentHTML('afterbegin', bubbles.join(''));
            historyButton.hidden = true;

            if (firstMessage && previousTop !== undefined) {
                body.scrollTop += firstMessage.getBoundingClientRect().top - previousTop;
            }
        }

        hasOlderMessages = hasMore;
        updateHistoryButton('ready');
        updateViewport();
    }

    function appendFailedMessage(chatId: string, text: string, messageId: string) {
        if (!currentDetails || currentDetails.chat.chat_id !== chatId) return;

        const bubble = chatMessageHbs({
            text,
            isFailed: true,
            messageId,
            mix: 'chat-history__message chat-history__message_direction_out',
        });

        const history = body.querySelector('.chat-history');
        if (history) {
            history.insertAdjacentHTML('beforeend', bubble);
        } else {
            body.innerHTML = chatBodyHbs({ bubbles: [bubble] });
        }

        body.scrollTop = body.scrollHeight;
        updateHistoryButtonVisibility();
    }

    function appendMessage(chatId: string, message: ChatMessage, messageId?: string) {
        if (!panel.isConnected || !currentDetails || currentDetails.chat.chat_id !== chatId) return;
        if (messageId) {
            body.querySelector(
                `.chat-message[data-message-id="${CSS.escape(messageId)}"]`,
            )?.remove();
        }
        if (renderedMessageIds.has(message.message_id)) return;

        const scrollToEnd =
            message.sender_id === userId ||
            body.scrollHeight - body.scrollTop - body.clientHeight <= 1;
        const history = body.querySelector('.chat-history');

        if (history) {
            history.insertAdjacentHTML(
                'beforeend',
                chatMessageTemplate(message, userId, currentDetails.peer_last_read_seq),
            );
            renderedMessageIds.add(message.message_id);
        } else {
            updateChat({ details: { ...currentDetails, is_empty: false }, messages: [message] });
        }

        if (scrollToEnd) body.scrollTop = body.scrollHeight;
        updateViewport();
    }

    return {
        updateChat,
        appendMessage,
        appendFailedMessage,
        prependMessages,
        updateHistoryButton,
        updatePeerReadPosition,
        checkVisibleRead,
        dispose,
    };
}
