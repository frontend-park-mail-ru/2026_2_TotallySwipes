import {
    ApiError,
    getChatDetails,
    getChatMessages,
    getChats,
    getCurrentUser,
    sendChatSeen,
} from '../../api/api.js';
import type { ChatCard, ChatMessage, ChatReadPosition } from '../../api/api.types.js';
import type { ChatSocket } from '../../api/chat-socket.js';
import type { RouteParams, Router } from '../../router.js';
import { getElement } from '../../utils/dom.js';
import { pluralize } from '../../utils/format.js';
import { chatTemplate, initChatPanel } from '../chat/chat.js';
import dialogListHbs from '../dialog-list/dialog-list.hbs';
import { dialogRowTemplate } from '../dialog-row/dialog-row.js';
import messagesHbs from './messages.hbs';

const updateSelectionByPage = new WeakMap<Element, (chatId: string | undefined) => void>();

function compareChatActivity(a: ChatCard, b: ChatCard): number {
    return Date.parse(b.last_activity_at) - Date.parse(a.last_activity_at);
}

function unreadLabel(count: number): string {
    if (count === 0) return '';

    const word = pluralize(count, 'диалог', 'диалога', 'диалогов');
    return `${count} ${word} с новыми сообщениями`;
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

    label.textContent = unreadLabel(count);
    label.hidden = count === 0;
}

function initChatSelection(
    page: HTMLElement,
    cards: ChatCard[],
    userId: number,
    chatSocket: ChatSocket,
) {
    const {
        updateChat,
        appendMessage,
        prependMessages,
        updateHistoryButton,
        updatePeerReadPosition,
        checkVisibleRead,
        dispose,
    } = initChatPanel(
        getElement(page, '.messages__chat'),
        userId,
        confirmVisibleRead,
        loadOlderMessages,
    );
    const dialogList = getElement(page, '.dialog-list');
    const rows = dialogList.querySelectorAll<HTMLAnchorElement>('.dialog-row');
    const rowsById = new Map(Array.from(rows, (row) => [row.dataset.chatId, row]));
    const cardsById = new Map(cards.map((card) => [card.chat_id, card]));
    const chatComposer = getElement<HTMLFormElement>(page, '.chat__composer');
    const chatTextInput = getElement<HTMLInputElement>(chatComposer, '.chat-composer__input');
    const sendButton = getElement<HTMLInputElement>(chatComposer, '.chat-composer__send');
    const recordButton = getElement<HTMLInputElement>(chatComposer, '.chat-composer__record');

    function updateComposerButtons() {
        const hasText = chatTextInput.value.trim().length > 0;
        sendButton.hidden = !hasText;
        recordButton.hidden = hasText;
    }

    chatTextInput.addEventListener('input', updateComposerButtons);

    let activeChatId: string | undefined;
    let readyChatId: string | undefined;
    let selectionVersion = 0;
    let olderHistoryCursor: number | null = null;
    let loadingOlderMessages = false;
    let pendingHistory: { chatId: string; messages: ChatMessage[] } | undefined;
    let retryDraft: { text: string; clientMessageId: string } | undefined;
    const seenRequests = new Map<string, 'pending' | 'done'>();
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
        if (chat_id === readyChatId) updatePeerReadPosition(user_id, last_read_seq);
    }

    async function confirmVisibleRead(chatId: string, seq: number) {
        if (chatId !== readyChatId || seq <= getReadPosition(chatId, userId)) return;

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
            if (confirmed && nextSeq > seq) void confirmVisibleRead(chatId, nextSeq);
        }
    }

    const unsubscribeMessages = chatSocket.subscribeToMessages((chatId, message) => {
        if (pendingHistory && pendingHistory.chatId === chatId) {
            pendingHistory.messages.push(message);
            return;
        }

        appendMessage(chatId, message);
    });

    function renderChatCard(card: ChatCard) {
        const chatId = card.chat_id;
        const row = rowsById.get(chatId);
        const listItem = row ? row.parentElement : document.createElement('li');
        if (!listItem) return;

        const template = document.createElement('template');
        template.innerHTML = dialogRowTemplate(card, userId, new Date());
        const nextRow = getElement<HTMLAnchorElement>(template.content, '.dialog-row');
        if (chatId === activeChatId) {
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
    const unsubscribeReadUpdates = chatSocket.subscribeToReadUpdates(applyReadPosition);

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

    chatComposer.addEventListener('submit', async (event) => {
        event.preventDefault();
        const chatId = readyChatId;
        const text = chatTextInput.value;
        if (!chatId || chatTextInput.disabled || !text.trim()) return;

        const version = selectionVersion;
        const clientMessageId =
            retryDraft && retryDraft.text === text
                ? retryDraft.clientMessageId
                : crypto.randomUUID();
        retryDraft = undefined;
        chatTextInput.value = '';
        updateComposerButtons();
        try {
            const message = await chatSocket.sendText(chatId, text, clientMessageId);
            if (!page.isConnected || version !== selectionVersion) return;

            appendMessage(chatId, message);
        } catch (error) {
            if (!page.isConnected || version !== selectionVersion) return;

            if (!chatTextInput.value) {
                retryDraft = { text, clientMessageId };
                chatTextInput.value = text;
                updateComposerButtons();
            }

            console.error('Не удалось отправить сообщение:', error);
        }
    });

    async function loadOlderMessages() {
        const chatId = readyChatId;
        const cursor = olderHistoryCursor;
        if (!chatId || cursor === null || loadingOlderMessages) return;

        const version = selectionVersion;
        loadingOlderMessages = true;
        updateHistoryButton('loading');
        try {
            const { items, next_cursor, has_more } = await getChatMessages(chatId, {
                before_seq: cursor,
            });
            if (!page.isConnected || version !== selectionVersion) return;

            const nextCursor =
                has_more && next_cursor !== null && next_cursor < cursor ? next_cursor : null;
            prependMessages(items, nextCursor !== null);
            olderHistoryCursor = nextCursor;
        } catch (error) {
            if (!page.isConnected || version !== selectionVersion) return;

            updateHistoryButton('retry');
            console.warn('Не удалось загрузить историю диалога:', error);
        } finally {
            if (version === selectionVersion) loadingOlderMessages = false;
        }
    }

    async function selectChat(chatId: string | undefined) {
        const version = ++selectionVersion;
        readyChatId = undefined;
        olderHistoryCursor = null;
        loadingOlderMessages = false;
        pendingHistory = undefined;
        retryDraft = undefined;
        const previousRow = activeChatId ? rowsById.get(activeChatId) : undefined;
        if (previousRow) {
            previousRow.classList.remove('dialog-row_active');
            previousRow.removeAttribute('aria-current');
        }
        activeChatId = chatId;
        const activeRow = chatId ? rowsById.get(chatId) : undefined;
        if (activeRow) {
            activeRow.classList.add('dialog-row_active');
            activeRow.setAttribute('aria-current', 'page');
        }

        if (!chatId) {
            updateChat();
            return;
        }

        const pendingMessages: ChatMessage[] = [];
        pendingHistory = { chatId, messages: pendingMessages };
        const preview = cardsById.get(chatId);
        updateChat({ preview, notice: 'Загрузка диалога...' });
        updateComposerButtons();
        try {
            const details = await getChatDetails(chatId);
            if (!page.isConnected || version !== selectionVersion) return;

            const { items, next_cursor, has_more } = await getChatMessages(chatId);
            if (!page.isConnected || version !== selectionVersion) return;

            olderHistoryCursor = has_more ? next_cursor : null;
            const messages = [...items, ...pendingMessages].sort((a, b) => a.seq - b.seq);
            const peerId = details.chat.peer.user_id;
            applyReadPosition({
                chat_id: chatId,
                user_id: userId,
                last_read_seq: details.last_read_seq,
            });
            applyReadPosition({
                chat_id: chatId,
                user_id: peerId,
                last_read_seq: details.peer_last_read_seq,
            });
            updateChat({
                details: { ...details, peer_last_read_seq: getReadPosition(chatId, peerId) },
                messages,
                hasOlderMessages: olderHistoryCursor !== null,
            });
            readyChatId = chatId;
            checkVisibleRead();
            void markChatSeen(cardsById.get(chatId) ?? details.chat);
        } catch (error) {
            if (!page.isConnected || version !== selectionVersion) return;

            const notFound = error instanceof ApiError && error.status === 404;
            if (!notFound) console.error('Не удалось загрузить диалог:', error);
            updateChat({
                preview: notFound ? undefined : preview,
                notice: notFound ? 'Диалог не найден' : 'Не удалось загрузить диалог',
            });
        } finally {
            if (version === selectionVersion) pendingHistory = undefined;
        }
    }

    function unsubscribe() {
        unsubscribeMessages();
        unsubscribeReadUpdates();
        dispose();
    }

    return { selectChat, applyChatCard, unsubscribe };
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

    function renderPage(content: { notice: string } | { dialogList: string; chat: string }) {
        page.innerHTML = messagesHbs({
            ...content,
            unreadLabel: unreadLabel(getUnreadChatCount()),
        });
    }

    renderPage({ notice: 'Загрузка диалогов...' });
    let selectedChatId = decodeChatId(params.chatId);
    let selection: ReturnType<typeof initChatSelection> | undefined;
    let disposed = false;
    const pendingCards = new Map<string, ChatCard>();
    const unsubscribeChatUpdates = chatSocket.subscribeToChatUpdates((card) => {
        if (selection) {
            selection.applyChatCard(card);
            return;
        }

        const previous = pendingCards.get(card.chat_id);
        if (!previous || card.version > previous.version) pendingCards.set(card.chat_id, card);
    });

    updateSelectionByPage.set(page, (chatId) => {
        if (chatId === selectedChatId) return;
        selectedChatId = chatId;
        if (selection) void selection.selectChat(chatId);
    });

    async function loadDialogs() {
        try {
            const [user, { items }] = await Promise.all([getCurrentUser(), getChats()]);
            if (disposed || !page.isConnected) return;

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
            if (selectedChatId) void selection.selectChat(selectedChatId);
        } catch (error) {
            if (disposed || !page.isConnected) return;

            unsubscribe();
            console.error('Не удалось загрузить диалоги:', error);
            renderPage({ notice: 'Не удалось загрузить диалоги' });
        }
    }

    function unsubscribe() {
        disposed = true;
        updateSelectionByPage.delete(page);
        unsubscribeChatUpdates();
        pendingCards.clear();
        if (selection) selection.unsubscribe();
    }

    void loadDialogs();
    return unsubscribe;
}
