import { create } from "zustand";
import type { Chat, LastMessage, Message, MessageReceipt, MessageReceiptUpdate } from "@app/shared-types/models";

type ChatStore = {
    messagesByChatId: Record<string, Message[]>;
    loadedChatIds: Record<string, boolean>;

    chats: Chat[];

    setChats: (chats: Chat[]) => void;
    appendChat: (chatId: string, chat: Chat) => void;

    setMessagesForChat: (chatId: string, messages: Message[]) => void;
    appendMessage: (chatId: string, message: Message) => void;
    setMessageReceipt: (messageId: string, userId: string, receipt: Omit<MessageReceiptUpdate, "messageId" | "userId">) => void;
    clearChat: (chatId: string) => void;
    clearAll: () => void;
};

function messageToLastMessage(message: Message): LastMessage {
    return {
        id: message.id,
        content: message.content,
        sender: message.sender,
        isDeleted: message.isDeleted,
        createdAt: message.createdAt,
        updatedAt: message.updatedAt,
    };
}

function getChatSortTimestamp(chat: Chat): number {
    return new Date(chat.lastMessage?.createdAt ?? chat.createdAt).getTime();
}

function orderChats(chats: Chat[]): Chat[] {
    return [...chats].sort((a, b) => getChatSortTimestamp(b) - getChatSortTimestamp(a));
}

function mergeChat(existing: Chat, incoming: Chat): Chat {
    return {
        ...existing,
        ...incoming,
        lastMessage: incoming.lastMessage ?? existing.lastMessage,
    };
}

function mergeMessage(existing: Message, incoming: Message): Message {
    return {
        ...existing,
        ...incoming,
        chat: {
            ...existing.chat,
            ...incoming.chat,
        },
        sender: {
            ...existing.sender,
            ...incoming.sender,
        },
        content: {
            ...existing.content,
            ...incoming.content,
            translation:
                incoming.content.translation ??
                existing.content.translation,
        },
        receipts: incoming.receipts !== undefined ? incoming.receipts : existing.receipts,
    };
}

function upsertReceipt(
    existingReceipts: MessageReceipt[],
    userId: string,
    updates: Omit<MessageReceiptUpdate, "messageId" | "userId">
): MessageReceipt[] {
    const idx = existingReceipts.findIndex((r) => r.userId === userId);
    if (idx === -1) {
        return [
            ...existingReceipts,
            {
                userId,
                deliveredAt: updates.deliveredAt,
                readAt: updates.readAt,
            },
        ];
    }

    const existing = existingReceipts[idx];
    const next: MessageReceipt = {
        ...existing,
        deliveredAt: updates.deliveredAt !== undefined ? updates.deliveredAt : existing.deliveredAt,
        readAt: updates.readAt !== undefined ? updates.readAt : existing.readAt,
    };

    return existingReceipts.map((r, i) => (i === idx ? next : r));
}

function mergeMessages(messages: Message[]): Message[] {
    const byId = new Map<string, Message>();
  
    for (const message of messages) {
        const existing = byId.get(message.id);
    
        if (!existing) {
            byId.set(message.id, message);
            continue;
        }
    
        byId.set(message.id, mergeMessage(existing, message));
    }
  
    return Array.from(byId.values()).sort(
        (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    );
}

export const useChatStore = create<ChatStore>((set) => ({
    messagesByChatId: {},
    loadedChatIds: {},
    chats: [],

    setChats: (chats) =>
        set(() => ({
            chats: orderChats(chats),
        })),

    appendChat: (chatId, chat) =>
        set((state) => {
            const normalized = chatId === chat.id ? chat : { ...chat, id: chatId };
            const idx = state.chats.findIndex((c) => c.id === normalized.id);

            const nextChats =
                idx === -1
                    ? [...state.chats, normalized]
                    : state.chats.map((c) => (c.id === normalized.id ? mergeChat(c, normalized) : c));

            return { chats: orderChats(nextChats) };
        }),

    setMessagesForChat: (chatId, messages) =>
        set((state) => {
            const existing = state.messagesByChatId[chatId] ?? [];
            const merged = mergeMessages([...existing, ...messages]);
            const last = merged[merged.length - 1];
            const chatIdx = state.chats.findIndex((c) => c.id === chatId);

            return {
                messagesByChatId: {
                    ...state.messagesByChatId,
                    [chatId]: merged,
                },
                loadedChatIds: {
                    ...state.loadedChatIds,
                    [chatId]: true,
                },
                chats:
                    last && chatIdx !== -1
                        ? orderChats(
                              state.chats.map((c) =>
                                  c.id === chatId ? { ...c, lastMessage: messageToLastMessage(last) } : c
                              )
                          )
                        : state.chats,
            };
        }),

    appendMessage: (chatId, message) =>
        set((state) => {
            const existing = state.messagesByChatId[chatId] ?? [];
            const merged = mergeMessages([...existing, message]);
            const last = merged[merged.length - 1];
            const chatIdx = state.chats.findIndex((c) => c.id === chatId);

            return {
                messagesByChatId: {
                    ...state.messagesByChatId,
                    [chatId]: merged,
                },
                chats:
                    last && chatIdx !== -1
                        ? orderChats(
                              state.chats.map((c) =>
                                  c.id === chatId ? { ...c, lastMessage: messageToLastMessage(last) } : c
                              )
                          )
                        : state.chats,
            };
        }),

    setMessageReceipt: (messageId, userId, receiptUpdates) =>
        set((state) => {
            const nextMessagesByChatId: Record<string, Message[]> = {};
            let didChange = false;

            for (const [chatId, messages] of Object.entries(state.messagesByChatId)) {
                const nextMessages = messages.map((m) => {
                    if (m.id !== messageId) return m;
                    const receipts = m.receipts ?? [];
                    didChange = true;
                    return {
                        ...m,
                        receipts: upsertReceipt(receipts, userId, receiptUpdates),
                    };
                });

                const unchanged =
                    nextMessages.length === messages.length &&
                    nextMessages.every((m, i) => m === messages[i]);

                nextMessagesByChatId[chatId] = unchanged ? messages : nextMessages;
            }

            if (!didChange) return state;
            return { messagesByChatId: nextMessagesByChatId };
        }),

    clearChat: (chatId) =>
        set((state) => {
            const nextMessages = { ...state.messagesByChatId };
            const nextLoaded = { ...state.loadedChatIds };

            delete nextMessages[chatId];
            delete nextLoaded[chatId];

            return {
                messagesByChatId: nextMessages,
                loadedChatIds: nextLoaded,
                chats: state.chats,
            };
        }),

    clearAll: () =>
        set({
            messagesByChatId: {},
            loadedChatIds: {},
            chats: [],
        }),
}));