import { useCallback, useEffect, useRef } from "react";
import { AppState, AppStateStatus } from "react-native";
import { getChats } from "@/src/api/chats";
import { getMessagesForChat, markAllMessagesAsDelivered } from "@/src/api/messages";
import { useChatStore } from "@/src/store/chatStore";
import type { Message } from "@app/shared-types/models";
import { PAGE_SIZE } from "@/src/constants/pagination";

function getLatestCreatedAt(messages: Message[] | undefined): string | null {
    if (!messages || messages.length === 0) return null;
    let latest: string | null = null;
    for (const m of messages) {
        if (!latest || new Date(m.createdAt).getTime() > new Date(latest).getTime()) {
            latest = m.createdAt;
        }
    }
    return latest;
}

export function useChatSync(trigger: boolean | number, enabled: boolean) {
    const setChats = useChatStore((s) => s.setChats);
    const mergeMessagesForChat = useChatStore((s) => s.mergeMessagesForChat);

    // Prevent overlapping syncs
    const inFlightRef = useRef(false);

    const sync = useCallback(async () => {
        if (inFlightRef.current) return;
        inFlightRef.current = true;
        try {
            // Mark all messages as delivered
            try {
                await markAllMessagesAsDelivered();
            } catch (e) {
                console.warn("useChatSync: failed to mark all messages as delivered", e);
            }

            // Refresh chat list
            try {
                const items = await getChats();
                setChats(items);
            } catch (e) {
                console.warn("useChatSync: failed to refresh chats", e);
            }

            // For chats we already have messages for, fetch anything we missed since our latest known message
            const state = useChatStore.getState();
            const loadedChatIds = Object.keys(state.loadedChatIds).filter(
                (id) => state.loadedChatIds[id]
            );

            await Promise.all(
                loadedChatIds.map(async (chatId) => {
                    try {
                        const since = getLatestCreatedAt(state.messagesByChatId[chatId]);
                        const missed = await getMessagesForChat({
                            chatId,
                            ...(since ? { since } : {}),
                            limit: PAGE_SIZE,
                        });
                        if (missed.length > 0) {
                            mergeMessagesForChat(chatId, missed);
                        }
                    } catch (e) {
                        console.warn(`useChatSync: failed to sync chat ${chatId}`, e);
                    }
                })
            );
        } finally {
            inFlightRef.current = false;
        }
    }, [setChats, mergeMessagesForChat]);

    // Re-sync when trigger changes (e.g. WS reconnected)
    useEffect(() => {
        if (!enabled) return;
        sync();
    }, [trigger, enabled, sync]);

    // Re-sync when the app comes back to the foreground (when the user returns to the app after being inactive)
    useEffect(() => {
        if (!enabled) return;

        const appStateRef = { current: AppState.currentState } as { current: AppStateStatus };

        const subscription = AppState.addEventListener("change", (next) => {
            const prev = appStateRef.current;
            appStateRef.current = next;
            if (prev.match(/inactive|background/) && next === "active") {
                sync();
            }
        });

        return () => subscription.remove();
    }, [enabled, sync]);

    return { sync };
}
