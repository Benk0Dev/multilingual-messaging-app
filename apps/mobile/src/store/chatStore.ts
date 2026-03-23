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

function dedupeMessages(messages: Message[]): Message[] {
    const seen = new Set<string>();
    const result: Message[] = [];

    for (const message of messages) {
        if (seen.has(message.id)) continue;
        seen.add(message.id);
        result.push(message);
    }

    result.sort(
        (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    );

    return result;
}

export const useChatStore = create<ChatStore>((set) => ({
    messagesByChatId: {},
    loadedChatIds: {},

    setMessagesForChat: (chatId, messages) =>
        set((state) => ({
            messagesByChatId: {
                ...state.messagesByChatId,
                [chatId]: dedupeMessages(messages),
            },
            loadedChatIds: {
                ...state.loadedChatIds,
                [chatId]: true,
            },
        })),

    appendMessage: (chatId, message) =>
        set((state) => {
            const existing = state.messagesByChatId[chatId] ?? [];
            const alreadyExists = existing.some((m) => m.id === message.id);

            if (alreadyExists) {
                return state;
            }

            return {
                messagesByChatId: {
                    ...state.messagesByChatId,
                    [chatId]: dedupeMessages([...existing, message]),
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