import {
    ApiError,
    getChatDetails,
    getChatMessages,
    getChats,
    getCurrentUser,
    NetworkError,
    sendChatSeen,
} from '../../api/api.js';
import type {
    ChatCard,
    ChatMessage,
    ChatMessagesPage,
    ChatReadPosition,
} from '../../api/api.types.js';
import type { ChatSocket } from '../../api/chat-socket.js';
import type { RouteParams, Router } from '../../router.js';
import { getElement } from '../../utils/dom.js';
import { pluralize } from '../../utils/format.js';
import { chatTemplate, initChatPanel } from '../chat/chat.js';
import dialogListHbs from '../dialog-list/dialog-list.hbs';
import { dialogRowTemplate } from '../dialog-row/dialog-row.js';
import messagesHbs from './messages.hbs';

const updateSelectionByPage = new WeakMap<Element, (chatId: string | undefined) => void>();
const HISTORY_RETRY_DELAY_MS = 2_000;

interface BufferedMessage {
    message: ChatMessage;
    messageId?: string;
}

interface PendingHistory {
    messages: Map<string, BufferedMessage>;
    afterSeq?: number;
}

interface SelectedHistory {
    chatId: string;
    olderCursor: number | null;
    loadingOlder: boolean;
    latestSeq: number;
    pending: PendingHistory | undefined;
}

function compareChatActivity(a: ChatCard, b: ChatCard): number {
    return Date.parse(b.last_activity_at) - Date.parse(a.last_activity_at);
}

function unreadLabels(count: number) {
    if (count === 0) return { unreadLabel: '', shortUnreadLabel: '' };

    const word = pluralize(count, 'диалог', 'диалога', 'диалогов');
    const shortWord = pluralize(count, 'новый', 'новых', 'новых');
    return {
        unreadLabel: `${count} ${word} с новыми сообщениями`,
        shortUnreadLabel: `${count} ${shortWord}`,
    };
}

function decodeChatId(segment: string | undefined): string | undefined {
    if (!segment) return;

    try {
        return decodeURIComponent(segment);
    } catch {
        return undefined;
    }
}

export function updateMessagesUnreadCount(count: number) {
    const label = document.querySelector<HTMLElement>('.messages__count');
    if (!label) return;

    const { unreadLabel, shortUnreadLabel } = unreadLabels(count);
    getElement(label, '.messages__count-full').textContent = unreadLabel;
    getElement(label, '.messages__count-short').textContent = shortUnreadLabel;
    label.hidden = count === 0;
}

interface OutgoingMessage {
    chatId: string;
    messageId: string;
    text: string;
    status: 'sending' | 'failed' | 'retrying';
}

function createMessageSender(
    chatSocket: ChatSocket,
    onConfirmed: (chatId: string, message: ChatMessage, messageId: string) => void,
    onFailed: (attempt: OutgoingMessage) => void,
) {
    const outgoingMessages = new Map<string, OutgoingMessage>();

    function confirm(chatId: string, messageId: string) {
        if (outgoingMessages.get(messageId)?.chatId !== chatId) return false;

        return outgoingMessages.delete(messageId);
    }

    async function deliver(attempt: OutgoingMessage) {
        const { chatId, messageId, text } = attempt;
        let message: ChatMessage;
        try {
            message = await chatSocket.sendText(chatId, text, messageId);
        } catch (error) {
            if (outgoingMessages.get(messageId) !== attempt) return;

            const firstFailure = attempt.status === 'sending';
            attempt.status = 'failed';
            if (firstFailure) onFailed(attempt);
            console.error('Не удалось отправить сообщение:', error);
            return;
        }

        if (confirm(chatId, messageId)) onConfirmed(chatId, message, messageId);
    }

    function send(chatId: string, text: string) {
        const messageId = crypto.randomUUID();
        const attempt: OutgoingMessage = { chatId, messageId, text, status: 'sending' };
        outgoingMessages.set(messageId, attempt);
        deliver(attempt);
    }

    function retry(chatId: string, messageId: string) {
        const attempt = outgoingMessages.get(messageId);
        if (!attempt || attempt.chatId !== chatId || attempt.status !== 'failed') return;

        attempt.status = 'retrying';
        deliver(attempt);
    }

    function getFailed(chatId: string) {
        return [...outgoingMessages.values()].filter(
            (attempt) => attempt.chatId === chatId && attempt.status !== 'sending',
        );
    }

    return { send, retry, confirm, getFailed, clear: () => outgoingMessages.clear() };
}

function createChatHistory(
    page: HTMLElement,
    panel: Pick<
        ReturnType<typeof initChatPanel>,
        'appendMessage' | 'prependMessages' | 'updateHistoryButton' | 'checkVisibleRead'
    >,
) {
    let selectedHistory: SelectedHistory | undefined;
    let retryTimer: number | undefined;

    function select(chatId: string | undefined) {
        window.clearTimeout(retryTimer);
        selectedHistory = chatId
            ? {
                  chatId,
                  olderCursor: null,
                  loadingOlder: false,
                  latestSeq: 0,
                  pending: { messages: new Map() },
              }
            : undefined;
    }

    function isCurrent(history: SelectedHistory) {
        return page.isConnected && selectedHistory === history;
    }

    function bufferMessage(pending: PendingHistory, message: ChatMessage, messageId?: string) {
        const previous = pending.messages.get(message.message_id);
        pending.messages.set(message.message_id, {
            message:
                previous && previous.message.version > message.version ? previous.message : message,
            messageId: messageId ?? previous?.messageId,
        });
    }

    function applyMessage(chatId: string, message: ChatMessage, messageId?: string) {
        const history = selectedHistory;
        if (!history || history.chatId !== chatId) return;

        if (history.pending) {
            bufferMessage(history.pending, message, messageId);
            return;
        }

        history.latestSeq = Math.max(history.latestSeq, message.seq);
        panel.appendMessage(chatId, message, messageId);
    }

    function finishInitial({ items, next_cursor, has_more }: ChatMessagesPage) {
        const history = selectedHistory;
        if (!history?.pending) return;

        for (const message of items) bufferMessage(history.pending, message);
        const messages = [...history.pending.messages.values()]
            .map(({ message }) => message)
            .sort((a, b) => a.seq - b.seq);
        history.olderCursor = has_more ? next_cursor : null;
        history.latestSeq = messages.at(-1)?.seq ?? 0;
        history.pending = undefined;
        return { messages, hasOlderMessages: history.olderCursor !== null };
    }

    async function loadOlder() {
        const history = selectedHistory;
        if (!history || history.olderCursor === null || history.loadingOlder) return;

        const cursor = history.olderCursor;
        history.loadingOlder = true;
        panel.updateHistoryButton('loading');
        try {
            const { items, next_cursor, has_more } = await getChatMessages(history.chatId, {
                before_seq: cursor,
            });
            if (!isCurrent(history)) return;

            history.olderCursor =
                has_more && next_cursor !== null && next_cursor < cursor ? next_cursor : null;
            panel.prependMessages(items, history.olderCursor !== null);
        } catch (error) {
            if (!isCurrent(history)) return;

            panel.updateHistoryButton('retry');
            console.warn('Не удалось загрузить историю диалога:', error);
        } finally {
            history.loadingOlder = false;
        }
    }

    async function catchUp() {
        window.clearTimeout(retryTimer);
        const history = selectedHistory;
        if (!history) return;

        const pending = {
            messages: history.pending?.messages ?? new Map<string, BufferedMessage>(),
            afterSeq: history.pending?.afterSeq ?? history.latestSeq,
        };
        history.pending = pending;
        try {
            while (true) {
                const { items, has_more, next_cursor } = await getChatMessages(history.chatId, {
                    after_seq: pending.afterSeq,
                });
                if (!isCurrent(history) || history.pending !== pending) return;

                for (const message of items) bufferMessage(pending, message);
                if (!has_more || next_cursor === null || next_cursor <= pending.afterSeq) break;
                pending.afterSeq = next_cursor;
            }
        } catch (error) {
            if (!isCurrent(history) || history.pending !== pending) return;

            console.warn('Не удалось догрузить сообщения после переподключения:', error);
            if (
                error instanceof NetworkError ||
                (error instanceof ApiError && error.status >= 500)
            ) {
                if (navigator.onLine) {
                    retryTimer = window.setTimeout(() => {
                        catchUp();
                    }, HISTORY_RETRY_DELAY_MS);
                }
                return;
            }
        }

        history.pending = undefined;
        const messages = [...pending.messages.values()].sort(
            (a, b) => a.message.seq - b.message.seq,
        );
        for (const { message, messageId } of messages)
            applyMessage(history.chatId, message, messageId);
        panel.checkVisibleRead();
    }

    return { select, applyMessage, finishInitial, loadOlder, catchUp };
}

function createChatReadState(
    page: HTMLElement,
    userId: number,
    chatSocket: ChatSocket,
    isOpenChat: (chatId: string) => boolean,
    updatePeerReadPosition: (peerId: number, seq: number) => void,
) {
    const readPositions = new Map<string, Map<number, number>>();
    const pendingReads = new Map<string, number>();

    function getReadPosition(chatId: string, readerId: number): number {
        return readPositions.get(chatId)?.get(readerId) ?? 0;
    }

    function applyReadPosition({ chat_id, user_id, last_read_seq }: ChatReadPosition) {
        if (last_read_seq <= getReadPosition(chat_id, user_id)) return;

        const positions = readPositions.get(chat_id) ?? new Map<number, number>();
        positions.set(user_id, last_read_seq);
        readPositions.set(chat_id, positions);
        if (isOpenChat(chat_id)) updatePeerReadPosition(user_id, last_read_seq);
    }

    async function confirmVisibleRead(chatId: string, seq: number) {
        if (!isOpenChat(chatId) || seq <= getReadPosition(chatId, userId)) return;

        const pendingSeq = pendingReads.get(chatId);
        pendingReads.set(chatId, Math.max(seq, pendingSeq ?? 0));
        if (pendingSeq !== undefined) return;

        let confirmed = false;
        try {
            const position = await chatSocket.readChat(chatId, seq);
            if (!page.isConnected || position.user_id !== userId) return;

            applyReadPosition(position);
            confirmed = position.last_read_seq >= seq;
        } catch (error) {
            if (page.isConnected) console.warn('Не удалось подтвердить прочтение:', error);
        } finally {
            const nextSeq = pendingReads.get(chatId) ?? seq;
            pendingReads.delete(chatId);
            if (confirmed && nextSeq > seq) confirmVisibleRead(chatId, nextSeq);
        }
    }

    const unsubscribe = chatSocket.subscribeToReadUpdates(applyReadPosition);
    return { getReadPosition, applyReadPosition, confirmVisibleRead, unsubscribe };
}

function initDialogList(page: HTMLElement, cards: ChatCard[], userId: number) {
    const dialogList = getElement(page, '.dialog-list');
    const rows = dialogList.querySelectorAll<HTMLAnchorElement>('.dialog-row');
    const rowsById = new Map(Array.from(rows, (row) => [row.dataset.chatId, row]));
    const cardsById = new Map(cards.map((card) => [card.chat_id, card]));
    const seenRequests = new Map<string, 'pending' | 'done'>();
    let selectedChatId: string | undefined;

    function select(chatId: string | undefined) {
        const previousRow = selectedChatId ? rowsById.get(selectedChatId) : undefined;
        if (previousRow) {
            previousRow.classList.remove('dialog-row_active');
            previousRow.removeAttribute('aria-current');
        }
        selectedChatId = chatId;
        const activeRow = chatId ? rowsById.get(chatId) : undefined;
        if (activeRow) {
            activeRow.classList.add('dialog-row_active');
            activeRow.setAttribute('aria-current', 'page');
        }
    }

    function renderChatCard(card: ChatCard) {
        const chatId = card.chat_id;
        const row = rowsById.get(chatId);
        const listItem = row ? row.parentElement : document.createElement('li');
        if (!listItem) return;

        const template = document.createElement('template');
        template.innerHTML = dialogRowTemplate(card, userId, new Date());
        const nextRow = getElement<HTMLAnchorElement>(template.content, '.dialog-row');
        if (chatId === selectedChatId) {
            nextRow.classList.add('dialog-row_active');
            nextRow.setAttribute('aria-current', 'page');
        }

        const wasFocused = document.activeElement === row;
        listItem.replaceChildren(nextRow);
        rowsById.set(chatId, nextRow);
        cardsById.set(chatId, card);

        const sortedCards = [...cardsById.values()].sort(compareChatActivity);
        const followingCard = sortedCards[sortedCards.indexOf(card) + 1];
        const followingRow = followingCard ? rowsById.get(followingCard.chat_id) : undefined;
        const followingItem = followingRow ? followingRow.parentElement : null;
        if (
            listItem.parentElement !== dialogList ||
            listItem.nextElementSibling !== followingItem
        ) {
            dialogList.insertBefore(listItem, followingItem);
        }
        if (wasFocused) nextRow.focus({ preventScroll: true });
    }

    function applyChatCard(card: ChatCard) {
        const currentCard = cardsById.get(card.chat_id);
        if (currentCard && card.version <= currentCard.version) return;

        const alreadySeen = seenRequests.get(card.chat_id) === 'done';
        renderChatCard(alreadySeen && card.is_new ? { ...card, is_new: false } : card);
    }

    async function markChatSeen(card: ChatCard) {
        const chatId = card.chat_id;
        if (!card.is_new || seenRequests.has(chatId)) return;

        seenRequests.set(chatId, 'pending');
        try {
            await sendChatSeen(chatId);
            seenRequests.set(chatId, 'done');
            if (!page.isConnected) return;

            const currentCard = cardsById.get(chatId);
            if (currentCard?.is_new) renderChatCard({ ...currentCard, is_new: false });
        } catch (error) {
            seenRequests.delete(chatId);
            if (page.isConnected) console.warn('Не удалось отметить диалог открытым:', error);
        }
    }

    return {
        select,
        applyChatCard,
        markChatSeen,
        getCard: (chatId: string) => cardsById.get(chatId),
    };
}

function initChatSelection(
    page: HTMLElement,
    cards: ChatCard[],
    userId: number,
    chatSocket: ChatSocket,
) {
    let activeChatId: string | undefined;
    let readyChatId: string | undefined;
    let selectionVersion = 0;
    const listeners = new AbortController();
    const dialogList = initDialogList(page, cards, userId);
    const panel = initChatPanel(
        getElement(page, '.messages__chat'),
        userId,
        (chatId, seq) => {
            reads.confirmVisibleRead(chatId, seq);
        },
        () => {
            history.loadOlder();
        },
        retryMessage,
        retryChatLoad,
    );
    const history = createChatHistory(page, panel);
    const reads = createChatReadState(
        page,
        userId,
        chatSocket,
        (chatId) => chatId === readyChatId,
        panel.updatePeerReadPosition,
    );
    const sender = createMessageSender(chatSocket, history.applyMessage, showFailedMessage);

    const unsubscribeMessages = chatSocket.subscribeToMessages((chatId, message, messageId) => {
        const ownMessageId = message.sender_id === userId ? messageId : undefined;
        if (ownMessageId) sender.confirm(chatId, ownMessageId);

        history.applyMessage(chatId, message, ownMessageId);
    });

    const chatComposer = getElement<HTMLFormElement>(page, '.chat__composer');
    const chatTextInput = getElement<HTMLInputElement>(chatComposer, '.chat-composer__input');
    const sendButton = getElement<HTMLButtonElement>(chatComposer, '.chat-composer__send');
    const recordButton = getElement<HTMLButtonElement>(chatComposer, '.chat-composer__record');

    function updateComposerButtons() {
        const hasText = chatTextInput.value.trim().length > 0;
        sendButton.hidden = !hasText;
        recordButton.hidden = hasText;
    }

    chatTextInput.addEventListener('input', updateComposerButtons, { signal: listeners.signal });
    chatComposer.addEventListener(
        'submit',
        (event) => {
            event.preventDefault();
            const text = chatTextInput.value;
            if (!readyChatId || chatTextInput.disabled || !text.trim()) return;

            chatTextInput.value = '';
            updateComposerButtons();
            sender.send(readyChatId, text);
        },
        { signal: listeners.signal },
    );

    function showFailedMessage({ chatId, text, messageId }: OutgoingMessage) {
        if (chatId === readyChatId && page.isConnected)
            panel.appendFailedMessage(chatId, text, messageId);
    }

    function retryMessage(messageId: string) {
        if (readyChatId && !chatTextInput.disabled) sender.retry(readyChatId, messageId);
    }

    function retryChatLoad() {
        if (activeChatId) selectChat(activeChatId);
    }

    function catchUpHistory() {
        if (readyChatId) history.catchUp();
        else retryChatLoad();
    }

    async function selectChat(chatId: string | undefined) {
        const version = ++selectionVersion;
        readyChatId = undefined;
        activeChatId = chatId;
        dialogList.select(chatId);
        history.select(chatId);

        if (!chatId) {
            panel.updateChat();
            return;
        }

        const preview = dialogList.getCard(chatId);
        panel.updateChat({ preview, notice: 'Загрузка диалога...' });
        updateComposerButtons();
        try {
            const details = await getChatDetails(chatId);
            if (!page.isConnected || version !== selectionVersion) return;

            const firstPage = await getChatMessages(chatId);
            if (!page.isConnected || version !== selectionVersion) return;

            const initial = history.finishInitial(firstPage);
            if (!initial) return;

            const peerId = details.chat.peer.user_id;
            reads.applyReadPosition({
                chat_id: chatId,
                user_id: userId,
                last_read_seq: details.last_read_seq,
            });
            reads.applyReadPosition({
                chat_id: chatId,
                user_id: peerId,
                last_read_seq: details.peer_last_read_seq,
            });
            panel.updateChat({
                details: { ...details, peer_last_read_seq: reads.getReadPosition(chatId, peerId) },
                ...initial,
            });
            readyChatId = chatId;
            for (const failed of sender.getFailed(chatId)) showFailedMessage(failed);
            panel.checkVisibleRead();
            dialogList.markChatSeen(dialogList.getCard(chatId) ?? details.chat);
        } catch (error) {
            if (!page.isConnected || version !== selectionVersion) return;

            history.select(undefined);
            const notFound = error instanceof ApiError && error.status === 404;
            if (!notFound) console.error('Не удалось загрузить диалог:', error);
            panel.updateChat({
                preview: notFound ? undefined : preview,
                notice: notFound ? 'Диалог не найден' : 'Не удалось загрузить диалог',
                canRetryLoad: !notFound,
            });
        }
    }

    function unsubscribe() {
        selectionVersion++;
        readyChatId = undefined;
        history.select(undefined);
        sender.clear();
        unsubscribeMessages();
        reads.unsubscribe();
        listeners.abort();
        panel.dispose();
    }

    return { selectChat, applyChatCard: dialogList.applyChatCard, catchUpHistory, unsubscribe };
}

export function updateMessagesPage(root: HTMLElement, params: RouteParams): boolean {
    const page = root.firstElementChild;
    if (!page) return false;

    const select = updateSelectionByPage.get(page);
    if (!select) return false;

    select(decodeChatId(params.chatId));
    return true;
}

export function renderMessagesPage(
    root: HTMLElement,
    _router: Router,
    params: RouteParams,
    chatSocket: ChatSocket,
    getUnreadChatCount: () => number,
) {
    const page = document.createElement('section');
    page.className = 'messages';
    root.append(page);
    const layout = root.closest('.layout');

    function updateMobileView(chatId: string | undefined) {
        const isChatOpen = Boolean(chatId);
        page.classList.toggle('messages_chat-open', isChatOpen);
        if (layout) layout.classList.toggle('layout_mobile-fullscreen', isChatOpen);
    }

    function renderPage(content: { notice: string } | { dialogList: string; chat: string }) {
        page.innerHTML = messagesHbs({
            ...content,
            ...unreadLabels(getUnreadChatCount()),
        });
    }

    let selectedChatId = decodeChatId(params.chatId);
    updateMobileView(selectedChatId);
    renderPage({ notice: 'Загрузка диалогов...' });
    let selection: ReturnType<typeof initChatSelection> | undefined;
    let disposed = false;
    let dialogsRequestVersion = 0;
    const pendingCards = new Map<string, ChatCard>();
    const unsubscribeChatUpdates = chatSocket.subscribeToChatUpdates((card) => {
        if (selection) {
            selection.applyChatCard(card);
            return;
        }

        const previous = pendingCards.get(card.chat_id);
        if (!previous || card.version > previous.version) pendingCards.set(card.chat_id, card);
    });
    const unsubscribeReconnect = chatSocket.subscribeToReconnect(() => {
        if (selection) selection.catchUpHistory();
        loadDialogs();
    });

    updateSelectionByPage.set(page, (chatId) => {
        if (chatId === selectedChatId) return;
        selectedChatId = chatId;
        updateMobileView(chatId);
        if (selection) selection.selectChat(chatId);
    });

    async function loadDialogs() {
        const version = ++dialogsRequestVersion;
        try {
            if (selection) {
                const { items } = await getChats();
                if (disposed || !page.isConnected || version !== dialogsRequestVersion) return;

                for (const card of items) selection.applyChatCard(card);
                return;
            }

            const [user, { items }] = await Promise.all([getCurrentUser(), getChats()]);
            if (disposed || !page.isConnected || version !== dialogsRequestVersion) return;

            const cardsById = new Map(items.map((card) => [card.chat_id, card]));
            for (const card of pendingCards.values()) {
                const previous = cardsById.get(card.chat_id);
                if (!previous || card.version > previous.version) cardsById.set(card.chat_id, card);
            }
            pendingCards.clear();

            const cards = [...cardsById.values()].sort(compareChatActivity);
            const now = new Date();
            const rows = cards.map((card) => dialogRowTemplate(card, user.user_id, now));

            renderPage({ dialogList: dialogListHbs({ rows }), chat: chatTemplate() });
            selection = initChatSelection(page, cards, user.user_id, chatSocket);
            if (selectedChatId) selection.selectChat(selectedChatId);
        } catch (error) {
            if (disposed || !page.isConnected || version !== dialogsRequestVersion) return;

            console.error('Не удалось загрузить диалоги:', error);
            if (!selection) renderPage({ notice: 'Не удалось загрузить диалоги' });
        }
    }

    function unsubscribe() {
        disposed = true;
        if (layout) layout.classList.remove('layout_mobile-fullscreen');
        updateSelectionByPage.delete(page);
        unsubscribeChatUpdates();
        unsubscribeReconnect();
        pendingCards.clear();
        if (selection) selection.unsubscribe();
    }

    loadDialogs();
    return unsubscribe;
}
