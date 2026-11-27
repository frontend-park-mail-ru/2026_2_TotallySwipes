import type { ChatCard, ChatSummary } from './api.types.js';
import { CHAT_SOCKET_URL } from './chat-socket.js';
import { checkAccess, mockReadChat, mockSendChatMessage } from './mocks.js';

type ChatCommand =
    | {
          type: 'message.send';
          request_id: string;
          data: { chat_id: string; text: string; client_message_id: string };
      }
    | {
          type: 'chat.read';
          request_id: string;
          data: { chat_id: string; last_read_seq: number };
      };

class MockChatSocket {
    readyState: number = WebSocket.CONNECTING;
    onopen: ((event: Event) => void) | null = null;
    onmessage: ((event: MessageEvent<string>) => void) | null = null;
    onclose: ((event: CloseEvent) => void) | null = null;

    constructor() {
        queueMicrotask(() => {
            if (this.readyState !== WebSocket.CONNECTING) return;

            this.readyState = WebSocket.OPEN;
            this.onopen?.(new Event('open'));
        });
    }

    send(payload: string) {
        if (this.readyState !== WebSocket.OPEN) return;

        const command = JSON.parse(payload) as ChatCommand;
        queueMicrotask(() => {
            if (this.readyState === WebSocket.OPEN) this.handleCommand(command);
        });
    }

    close() {
        if (this.readyState >= WebSocket.CLOSING) return;

        this.readyState = WebSocket.CLOSING;
        queueMicrotask(() => {
            this.readyState = WebSocket.CLOSED;
            this.onclose?.(new CloseEvent('close', { code: 1000, wasClean: true }));
        });
    }

    private emit(packet: object) {
        this.onmessage?.(new MessageEvent('message', { data: JSON.stringify(packet) }));
    }

    private reject(requestId: string, code: string, message: string) {
        this.emit({ type: 'command.error', request_id: requestId, error: { code, message } });
    }

    private publishChatChanges({ chat, summary }: { chat: ChatCard; summary: ChatSummary }) {
        this.emit({ type: 'chat.updated', data: chat });
        this.emit({ type: 'chats.summary.updated', data: summary });
    }

    private handleCommand({ type, request_id, data }: ChatCommand) {
        if (checkAccess('/api/v1/chats')) {
            this.reject(request_id, 'UNAUTHORIZED', 'Необходимо войти заново.');
            return;
        }

        if (type === 'message.send') {
            const { chat_id, text, client_message_id } = data;
            if (!text.trim()) {
                this.reject(request_id, 'VALIDATION_ERROR', 'Введите текст сообщения');
                return;
            }

            const result = mockSendChatMessage(chat_id, text, client_message_id);
            if (!result) {
                this.reject(request_id, 'CHAT_NOT_FOUND', 'Диалог не найден');
                return;
            }
            if (result.message.text !== text) {
                this.reject(
                    request_id,
                    'IDEMPOTENCY_CONFLICT',
                    'С этим ID уже отправлено сообщение',
                );
                return;
            }

            const messageData = { chat_id, client_message_id, message: result.message };
            this.emit({ type: 'command.result', request_id, data: messageData });
            this.emit({ type: 'message.created', data: messageData });
            this.publishChatChanges(result);
        } else if (type === 'chat.read') {
            const result = mockReadChat(data.chat_id, data.last_read_seq);
            if (!result) {
                this.reject(request_id, 'CHAT_NOT_FOUND', 'Диалог не найден');
                return;
            }

            this.emit({ type: 'command.result', request_id, data: result.position });
            this.emit({ type: 'chat.read.updated', data: result.position });
            this.publishChatChanges(result);
        }
    }
}

export function installMockChatSocket() {
    window.WebSocket = new Proxy(window.WebSocket, {
        construct(target, args, newTarget) {
            if (String(args[0]) === CHAT_SOCKET_URL && args[1] === undefined) {
                return new MockChatSocket();
            }

            return Reflect.construct(target, args, newTarget);
        },
    });
}
