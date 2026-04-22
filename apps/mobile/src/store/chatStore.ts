import { create } from "zustand";
import type { Chat, LastMessage, Message, MessageReceipt, MessageReceiptUpdate } from "@app/shared-types/models";

export type PendingOutgoing = {
    clientId: string;
    text: string;
    sentAt: number;
};

type ChatStore = {
    messagesByChatId: Record<string, Message[]>;
    loadedChatIds: Record<string, boolean>;
    chats: Chat[];

    // Receipts that arrived over the wire for messages we don't have yet
    pendingReceiptsByMessageId: Record<string, Omit<MessageReceiptUpdate, "messageId">[]>;

    // Optimistic outgoing messages keyed by chat id
    pendingOutgoingByChatId: Record<string, PendingOutgoing[]>;

    // True if there might be older messages on the server that we haven't fetched yet
    hasMoreOlderByChat: Record<string, boolean>;

    setChats: (chats: Chat[]) => void;
    appendChat: (chatId: string, chat: Chat) => void;

    setMessagesForChat: (chatId: string, messages: Message[]) => void;
    appendMessage: (chatId: string, message: Message) => void;
    mergeMessagesForChat: (chatId: string, messages: Message[]) => void;

    setMessageReceipt: (
        messageId: string,
        userId: string,
        receipt: Omit<MessageReceiptUpdate, "messageId" | "userId">
    ) => void;

    addPendingOutgoing: (chatId: string, pending: PendingOutgoing) => void;
    removePendingOutgoing: (chatId: string, clientId: string) => void;

    setHasMoreOlder: (chatId: string, hasMore: boolean) => void;

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
    const existingLastMessageCreatedAt = existing.lastMessage ? new Date(existing.lastMessage.createdAt).getTime() : 0;
    const incomingLastMessageCreatedAt = incoming.lastMessage ? new Date(incoming.lastMessage.createdAt).getTime() : 0;
    const lastMessage = incomingLastMessageCreatedAt >= existingLastMessageCreatedAt ? incoming.lastMessage ?? existing.lastMessage : existing.lastMessage;

    return {
        ...existing,
        ...incoming,
        lastMessage,
    };
}

function mergeReceipts(
    existing: MessageReceipt[] | undefined,
    incoming: MessageReceipt[] | undefined
): MessageReceipt[] | undefined {
    if (!existing && !incoming) return undefined;
    if (!existing) return incoming;
    if (!incoming) return existing;

    const byUser = new Map<string, MessageReceipt>();
    for (const r of existing) byUser.set(r.userId, r);
    for (const r of incoming) {
        const prev = byUser.get(r.userId);
        if (!prev) {
            byUser.set(r.userId, r);
            continue;
        }
        byUser.set(r.userId, {
            userId: r.userId,
            deliveredAt: pickLaterTimestamp(prev.deliveredAt, r.deliveredAt),
            readAt: pickLaterTimestamp(prev.readAt, r.readAt),
        });
    }
    return Array.from(byUser.values());
}

function pickLaterTimestamp(a: string | null | undefined, b: string | null | undefined): string | null {
    if (!a && !b) return null;
    if (!a) return b ?? null;
    if (!b) return a;
    return new Date(a).getTime() >= new Date(b).getTime() ? a : b;
}

function mergeMessage(existing: Message, incoming: Message): Message {
    // If the incoming message is older than what we have, only backfill missing fields - never overwrite newer data
    const existingUpdatedAt = new Date(existing.updatedAt).getTime();
    const incomingUpdatedAt = new Date(incoming.updatedAt).getTime();
    const incomingIsStale = incomingUpdatedAt < existingUpdatedAt;

    if (incomingIsStale) {
        return {
            ...incoming,
            ...existing,
            content: {
                ...incoming.content,
                ...existing.content,
                translation: existing.content.translation ?? incoming.content.translation,
            },
            receipts: mergeReceipts(existing.receipts, incoming.receipts),
        };
    }

    return {
        ...existing,
        ...incoming,
        chatId: incoming.chatId ?? existing.chatId,
        sender: {
            ...existing.sender,
            ...incoming.sender,
        },
        content: {
            ...existing.content,
            ...incoming.content,
            translation: incoming.content.translation ?? existing.content.translation,
        },
        receipts: mergeReceipts(existing.receipts, incoming.receipts),
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
                deliveredAt: updates.deliveredAt ?? null,
                readAt: updates.readAt ?? null,
            },
        ];
    }

    const existing = existingReceipts[idx];
    const next: MessageReceipt = {
        ...existing,
        deliveredAt:
            updates.deliveredAt !== undefined
                ? pickLaterTimestamp(existing.deliveredAt, updates.deliveredAt)
                : existing.deliveredAt,
        readAt:
            updates.readAt !== undefined
                ? pickLaterTimestamp(existing.readAt, updates.readAt)
                : existing.readAt,
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

function drainPendingReceipts(
    messages: Message[],
    pendingReceipts: ChatStore["pendingReceiptsByMessageId"]
): { messages: Message[]; pendingReceipts: ChatStore["pendingReceiptsByMessageId"] } {
    let nextPending = pendingReceipts;
    let didTouch = false;
    const nextMessages = messages.map((m) => {
        const pending = pendingReceipts[m.id];
        if (!pending || pending.length === 0) return m;

        if (!didTouch) {
            nextPending = { ...pendingReceipts };
            didTouch = true;
        }
        delete nextPending[m.id];

        let receipts = m.receipts ?? [];
        for (const update of pending) {
            receipts = upsertReceipt(receipts, update.userId, {
                deliveredAt: update.deliveredAt,
                readAt: update.readAt,
            });
        }
        return { ...m, receipts };
    });

    return { messages: nextMessages, pendingReceipts: nextPending };
}

export const useChatStore = create<ChatStore>((set) => ({
    messagesByChatId: {},
    loadedChatIds: {},
    chats: [],
    pendingReceiptsByMessageId: {},
    pendingOutgoingByChatId: {},
    hasMoreOlderByChat: {},

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

            const { messages: drained, pendingReceipts: nextPendingReceipts } =
                drainPendingReceipts(merged, state.pendingReceiptsByMessageId);

            const last = drained[drained.length - 1];
            const chatIdx = state.chats.findIndex((c) => c.id === chatId);

            return {
                messagesByChatId: {
                    ...state.messagesByChatId,
                    [chatId]: drained,
                },
                loadedChatIds: {
                    ...state.loadedChatIds,
                    [chatId]: true,
                },
                pendingReceiptsByMessageId: nextPendingReceipts,
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

    mergeMessagesForChat: (chatId, messages) =>
        set((state) => {
            if (messages.length === 0) return state;

            const existing = state.messagesByChatId[chatId] ?? [];
            const merged = mergeMessages([...existing, ...messages]);

            const { messages: drained, pendingReceipts: nextPendingReceipts } =
                drainPendingReceipts(merged, state.pendingReceiptsByMessageId);

            const last = drained[drained.length - 1];
            const chatIdx = state.chats.findIndex((c) => c.id === chatId);

            return {
                messagesByChatId: {
                    ...state.messagesByChatId,
                    [chatId]: drained,
                },
                pendingReceiptsByMessageId: nextPendingReceipts,
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

            const { messages: drained, pendingReceipts: nextPendingReceipts } =
                drainPendingReceipts(merged, state.pendingReceiptsByMessageId);

            const last = drained[drained.length - 1];
            const chatIdx = state.chats.findIndex((c) => c.id === chatId);

            return {
                messagesByChatId: {
                    ...state.messagesByChatId,
                    [chatId]: drained,
                },
                pendingReceiptsByMessageId: nextPendingReceipts,
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
            let didFindMessage = false;
            let didChange = false;

            for (const [chatId, messages] of Object.entries(state.messagesByChatId)) {
                let chatChanged = false;
                const nextMessages = messages.map((m) => {
                    if (m.id !== messageId) return m;
                    didFindMessage = true;
                    chatChanged = true;
                    const receipts = m.receipts ?? [];
                    return {
                        ...m,
                        receipts: upsertReceipt(receipts, userId, receiptUpdates),
                    };
                });

                if (chatChanged) didChange = true;
                nextMessagesByChatId[chatId] = chatChanged ? nextMessages : messages;
            }

            if (didFindMessage) {
                if (!didChange) return state;
                return { messagesByChatId: nextMessagesByChatId };
            }

            // Message not in store yet - stash the receipt so it can be applied when the message arrives
            const existingBucket = state.pendingReceiptsByMessageId[messageId] ?? [];
            const filtered = existingBucket.filter((r) => r.userId !== userId);
            const nextBucket = [...filtered, { userId, ...receiptUpdates }];

            return {
                pendingReceiptsByMessageId: {
                    ...state.pendingReceiptsByMessageId,
                    [messageId]: nextBucket,
                },
            };
        }),

    addPendingOutgoing: (chatId, pending) =>
        set((state) => {
            const bucket = state.pendingOutgoingByChatId[chatId] ?? [];
            return {
                pendingOutgoingByChatId: {
                    ...state.pendingOutgoingByChatId,
                    [chatId]: [...bucket, pending],
                },
            };
        }),

    removePendingOutgoing: (chatId, clientId) =>
        set((state) => {
            const bucket = state.pendingOutgoingByChatId[chatId];
            if (!bucket) return state;
            const next = bucket.filter((p) => p.clientId !== clientId);
            if (next.length === bucket.length) return state;
            return {
                pendingOutgoingByChatId: {
                    ...state.pendingOutgoingByChatId,
                    [chatId]: next,
                },
            };
        }),

    setHasMoreOlder: (chatId, hasMore) =>
        set((state) => ({
            hasMoreOlderByChat: {
                ...state.hasMoreOlderByChat,
                [chatId]: hasMore,
            },
        })),

    clearChat: (chatId) =>
        set((state) => {
            const nextMessages = { ...state.messagesByChatId };
            const nextLoaded = { ...state.loadedChatIds };
            const nextPendingOutgoing = { ...state.pendingOutgoingByChatId };
            const nextHasMoreOlder = { ...state.hasMoreOlderByChat };

            delete nextMessages[chatId];
            delete nextLoaded[chatId];
            delete nextPendingOutgoing[chatId];
            delete nextHasMoreOlder[chatId];

            return {
                messagesByChatId: nextMessages,
                loadedChatIds: nextLoaded,
                pendingOutgoingByChatId: nextPendingOutgoing,
                hasMoreOlderByChat: nextHasMoreOlder,
                chats: state.chats,
            };
        }),

    clearAll: () =>
        set({
            messagesByChatId: {},
            loadedChatIds: {},
            chats: [],
            pendingReceiptsByMessageId: {},
            pendingOutgoingByChatId: {},
            hasMoreOlderByChat: {},
        }),
}));