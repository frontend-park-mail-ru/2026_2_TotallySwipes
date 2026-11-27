import type { ChatCard, ChatMessage, ChatReadPosition, ChatSummary } from './api.types.js';

export const CHAT_SOCKET_URL = import.meta.env.VITE_WS_URL;

const SEND_TIMEOUT_MS = 10_000;
const FIRST_RECONNECT_DELAY_MS = 1_000;
const MAX_RECONNECT_DELAY_MS = 30_000;

interface MessageCreatedData {
    chat_id: string;
    client_message_id?: string | null;
    message: ChatMessage;
}

type MessageCreatedHandler = (chatId: string, message: ChatMessage, messageId?: string) => void;
type ChatUpdatedHandler = (card: ChatCard) => void;
type ChatReadHandler = (position: ChatReadPosition) => void;
type ChatSummaryHandler = (summary: ChatSummary) => void;
type CommandResultData = Partial<ChatReadPosition> & { message?: ChatMessage };
type CommandErrorPacket = {
    type: 'command.error';
    request_id: string | null;
    error: {
        code: string;
        message: string;
        fields?: Record<string, string>;
    };
};
type ChatSocketPacket =
    | { type: 'message.created'; data?: MessageCreatedData }
    | { type: 'chat.created' | 'chat.updated'; data?: ChatCard }
    | { type: 'chat.read.updated'; data?: ChatReadPosition }
    | { type: 'chats.summary.updated'; data?: ChatSummary }
    | { type: 'command.result'; request_id: string; data?: CommandResultData }
    | CommandErrorPacket;

interface PendingCommand {
    resolveResult: (data: CommandResultData | undefined) => boolean;
    reject: (error: unknown) => void;
    timeout: number;
}

function isReadPosition(data: Partial<ChatReadPosition> | undefined): data is ChatReadPosition {
    return Boolean(
        data &&
        typeof data.chat_id === 'string' &&
        data.chat_id &&
        Number.isSafeInteger(data.user_id) &&
        typeof data.last_read_seq === 'number' &&
        Number.isSafeInteger(data.last_read_seq) &&
        data.last_read_seq >= 0,
    );
}

export function createChatSocket(chatSummaryHandler: ChatSummaryHandler) {
    let socket: WebSocket | undefined;
    let active = false;
    let interrupted = false;
    let reconnectTimer: number | undefined;
    let reconnectDelay = FIRST_RECONNECT_DELAY_MS;
    let messageHandler: MessageCreatedHandler | undefined;
    let chatUpdatedHandler: ChatUpdatedHandler | undefined;
    let chatReadHandler: ChatReadHandler | undefined;
    const pendingCommands = new Map<string, PendingCommand>();
    const reconnectHandlers = new Set<() => void>();

    function takePendingCommand(requestId: string) {
        const pending = pendingCommands.get(requestId);
        if (!pending) return;

        pendingCommands.delete(requestId);
        clearTimeout(pending.timeout);
        return pending;
    }

    function rejectPendingCommands() {
        const error = new Error('Соединение с чатом закрыто');
        for (const pending of pendingCommands.values()) {
            clearTimeout(pending.timeout);
            pending.reject(error);
        }
        pendingCommands.clear();
    }

    function subscribeToMessages(handler: MessageCreatedHandler) {
        messageHandler = handler;

        return () => {
            if (messageHandler === handler) messageHandler = undefined;
        };
    }

    function subscribeToChatUpdates(handler: ChatUpdatedHandler) {
        chatUpdatedHandler = handler;

        return () => {
            if (chatUpdatedHandler === handler) chatUpdatedHandler = undefined;
        };
    }

    function subscribeToReadUpdates(handler: ChatReadHandler) {
        chatReadHandler = handler;

        return () => {
            if (chatReadHandler === handler) chatReadHandler = undefined;
        };
    }

    function subscribeToReconnect(handler: () => void) {
        reconnectHandlers.add(handler);
        return () => {
            reconnectHandlers.delete(handler);
        };
    }

    function connect() {
        if (!active) {
            active = true;
            window.addEventListener('online', openSocket);
            window.addEventListener('offline', handleOffline);
        }

        openSocket();
    }

    function handleOffline() {
        interrupted = true;
        window.clearTimeout(reconnectTimer);
        closeSocket();
    }

    function openSocket() {
        window.clearTimeout(reconnectTimer);
        if (!active) return;
        if (!navigator.onLine) {
            handleOffline();
            return;
        }
        if (
            socket &&
            (socket.readyState === WebSocket.OPEN || socket.readyState === WebSocket.CONNECTING)
        ) {
            return;
        }

        closeSocket();

        let connection: WebSocket;
        try {
            connection = new WebSocket(CHAT_SOCKET_URL);
        } catch (error) {
            console.error('Не удалось открыть WebSocket чата:', error);
            return;
        }
        socket = connection;

        connection.onopen = () => {
            if (socket !== connection) return;

            console.log('Сокет открыт');
            reconnectDelay = FIRST_RECONNECT_DELAY_MS;
            if (interrupted) {
                interrupted = false;
                for (const handler of reconnectHandlers) handler();
            }
        };

        connection.onclose = () => {
            if (socket !== connection) return;

            socket = undefined;
            rejectPendingCommands();
            interrupted = true;
            console.log('Сокет закрыт');
            if (!navigator.onLine) return;

            reconnectTimer = window.setTimeout(openSocket, reconnectDelay);
            reconnectDelay = Math.min(reconnectDelay * 2, MAX_RECONNECT_DELAY_MS);
        };

        connection.onerror = () => {
            if (socket === connection) console.warn('Ошибка соединения с чатом');
        };

        connection.onmessage = (event) => {
            if (socket !== connection || typeof event.data !== 'string') return;

            let packet: ChatSocketPacket | null;
            try {
                packet = JSON.parse(event.data);
            } catch {
                console.warn('Не удалось разобрать пакет чата');
                return;
            }

            if (!packet) return;

            switch (packet.type) {
                case 'message.created': {
                    const data = packet.data;
                    if (
                        typeof data?.chat_id !== 'string' ||
                        typeof data.message?.message_id !== 'string' ||
                        typeof data.message.seq !== 'number'
                    ) {
                        return;
                    }
                    const messageId = data.client_message_id;
                    if (messageHandler) {
                        messageHandler(
                            data.chat_id,
                            data.message,
                            typeof messageId === 'string' ? messageId : undefined,
                        );
                    }
                    break;
                }

                case 'chat.created':
                case 'chat.updated': {
                    const card = packet.data;
                    if (
                        !card ||
                        typeof card.chat_id !== 'string' ||
                        !card.chat_id ||
                        !Number.isSafeInteger(card.version) ||
                        card.version < 1
                    ) {
                        return;
                    }
                    if (chatUpdatedHandler) chatUpdatedHandler(card);
                    break;
                }

                case 'chats.summary.updated': {
                    const data = packet.data;
                    if (
                        !data ||
                        !Number.isSafeInteger(data.version) ||
                        !Number.isSafeInteger(data.unread_chats_count) ||
                        data.unread_chats_count < 0
                    ) {
                        return;
                    }
                    chatSummaryHandler(data);
                    break;
                }

                case 'chat.read.updated': {
                    if (chatReadHandler && isReadPosition(packet.data))
                        chatReadHandler(packet.data);
                    break;
                }

                case 'command.result': {
                    if (typeof packet.request_id !== 'string') return;

                    const pending = pendingCommands.get(packet.request_id);
                    if (pending && pending.resolveResult(packet.data)) {
                        takePendingCommand(packet.request_id);
                    }
                    break;
                }

                case 'command.error': {
                    const { request_id, error } = packet;
                    if (
                        (request_id !== null && typeof request_id !== 'string') ||
                        !error ||
                        typeof error.code !== 'string' ||
                        typeof error.message !== 'string'
                    ) {
                        return;
                    }
                    const pending =
                        request_id === null ? undefined : takePendingCommand(request_id);
                    if (pending) {
                        const commandError = Object.assign(new Error(error.message), {
                            code: error.code,
                            fields: error.fields,
                        });
                        pending.reject(commandError);
                    } else {
                        console.warn(
                            'Команда чата отклонена:',
                            request_id,
                            error.code,
                            error.message,
                        );
                    }
                    break;
                }

                default:
                    return;
            }
        };
    }

    function disconnect() {
        active = false;
        interrupted = false;
        reconnectDelay = FIRST_RECONNECT_DELAY_MS;
        window.clearTimeout(reconnectTimer);
        window.removeEventListener('online', openSocket);
        window.removeEventListener('offline', handleOffline);
        closeSocket();
    }

    function closeSocket() {
        const connection = socket;
        if (!connection) return;

        socket = undefined;
        rejectPendingCommands();
        connection.close();
    }

    async function sendCommand<T>(
        type: 'message.send' | 'chat.read',
        data: object,
        getResult: (result: CommandResultData | undefined) => T | undefined,
    ): Promise<T> {
        const connection = socket;
        if (!connection || connection.readyState !== WebSocket.OPEN) {
            throw new Error('Сокет чата не открыт');
        }

        const requestId = crypto.randomUUID();
        const packet = { type, request_id: requestId, data };

        return new Promise((resolve, reject) => {
            const timeout = setTimeout(() => {
                pendingCommands.delete(requestId);
                reject(new Error('таймаут отправки'));
            }, SEND_TIMEOUT_MS);
            pendingCommands.set(requestId, {
                resolveResult(result) {
                    const value = getResult(result);
                    if (value === undefined) return false;

                    resolve(value);
                    return true;
                },
                reject,
                timeout,
            });

            try {
                connection.send(JSON.stringify(packet));
            } catch (error) {
                takePendingCommand(requestId);
                reject(error);
            }
        });
    }

    function sendText(chatId: string, text: string, clientMessageId: string): Promise<ChatMessage> {
        return sendCommand(
            'message.send',
            { chat_id: chatId, client_message_id: clientMessageId, text },
            (result) => {
                const message = result?.message;
                if (typeof message?.message_id === 'string' && typeof message.seq === 'number') {
                    return message;
                }
            },
        );
    }

    function readChat(chatId: string, lastReadSeq: number): Promise<ChatReadPosition> {
        return sendCommand(
            'chat.read',
            { chat_id: chatId, last_read_seq: lastReadSeq },
            (result) => {
                if (isReadPosition(result) && result.chat_id === chatId) return result;
            },
        );
    }

    return {
        connect,
        disconnect,
        sendText,
        readChat,
        subscribeToMessages,
        subscribeToChatUpdates,
        subscribeToReadUpdates,
        subscribeToReconnect,
    };
}

export type ChatSocket = ReturnType<typeof createChatSocket>;
