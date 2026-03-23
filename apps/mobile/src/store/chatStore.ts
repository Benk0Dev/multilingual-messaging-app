import { create } from "zustand";
import { Message } from "@app/shared-types/models";

type ChatStore = {
    messagesByChatId: Record<string, Message[]>;
    loadedChatIds: Record<string, boolean>;

    setMessagesForChat: (chatId: string, messages: Message[]) => void;
    appendMessage: (chatId: string, message: Message) => void;
    clearChat: (chatId: string) => void;
    clearAll: () => void;
};

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
    };
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

    setMessagesForChat: (chatId, messages) =>
        set((state) => {
            const existing = state.messagesByChatId[chatId] ?? [];

            return {
                messagesByChatId: {
                    ...state.messagesByChatId,
                    [chatId]: mergeMessages([...existing, ...messages]),
                },
                loadedChatIds: {
                    ...state.loadedChatIds,
                    [chatId]: true,
                },
            };
        }),

    appendMessage: (chatId, message) =>
        set((state) => {
            const existing = state.messagesByChatId[chatId] ?? [];

            return {
                messagesByChatId: {
                    ...state.messagesByChatId,
                    [chatId]: mergeMessages([...existing, message]),
                },
            };
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
            };
        }),

    clearAll: () =>
        set({
            messagesByChatId: {},
            loadedChatIds: {},
        }),
}));