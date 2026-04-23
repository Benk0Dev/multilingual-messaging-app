import { Tabs } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { getValidAccessToken, hasSession } from "../../src/auth/session";
import useAppWebSocket from "@/src/hooks/useAppWebSocket";
import { useUserStore } from "@/src/store/userStore";
import { useChatStore } from "@/src/store/chatStore";
import { markMessagesAsDelivered } from "@/src/api/messages";
import { useChatSync } from "@/src/hooks/useChatSync";
import { getChats } from "@/src/api/chats";
import type { Message } from "@app/shared-types/models";

export default function AppLayout() {
    const [sessionPresent, setSessionPresent] = useState<boolean | null>(null);

    const me = useUserStore((state) => state.me);

    const appendChat = useChatStore((state) => state.appendChat);
    const appendMessage = useChatStore((state) => state.appendMessage);
    const setMessageReceipt = useChatStore((state) => state.setMessageReceipt);
    const setChats = useChatStore((state) => state.setChats);

    const orphanMessagesRef = useRef<Map<string, Message[]>>(new Map());

    useEffect(() => {
        let isActive = true;
        (async () => {
            const present = await hasSession();
            if (isActive) setSessionPresent(present);
        })();
        return () => {
            isActive = false;
        };
    }, []);

    const getAccessToken = useCallback(async () => {
        return getValidAccessToken();
    }, []);

    const drainOrphansForChat = useCallback((chatId: string) => {
        const buffered = orphanMessagesRef.current.get(chatId);
        if (!buffered || buffered.length === 0) return;
        orphanMessagesRef.current.delete(chatId);
        for (const msg of buffered) {
            appendMessage(chatId, msg);
        }
    }, [appendMessage]);

    const drainAllOrphansAgainst = useCallback((knownChatIds: Set<string>) => {
        for (const chatId of Array.from(orphanMessagesRef.current.keys())) {
            if (knownChatIds.has(chatId)) {
                drainOrphansForChat(chatId);
            }
        }
    }, [drainOrphansForChat]);

    const { connectionCount } = useAppWebSocket({
        getAccessToken: sessionPresent ? getAccessToken : null,
        onEvent: (event) => {
            if (event.type === "chat.created") {
                appendChat(event.chat.id, event.chat);
                drainOrphansForChat(event.chat.id);
            }

            if (event.type === "message.created") {
                const isOwnMessage = me && event.message.sender.id === me.id;
                const knownChatIds = new Set(
                    useChatStore.getState().chats.map((c) => c.id)
                );
                const chatIsKnown = knownChatIds.has(event.message.chatId);

                if (chatIsKnown) {
                    appendMessage(event.message.chatId, event.message);
                } else {
                    const existing = orphanMessagesRef.current.get(event.message.chatId) ?? [];
                    orphanMessagesRef.current.set(event.message.chatId, [...existing, event.message]);

                    (async () => {
                        try {
                            const refreshed = await getChats();
                            setChats(refreshed);
                            drainAllOrphansAgainst(new Set(refreshed.map((c) => c.id)));
                        } catch (e) {
                            console.warn("Failed to refresh chats after unknown-chat message", e);
                        }
                    })();
                }

                if (!isOwnMessage) {
                    markMessagesAsDelivered({
                        messageIds: [event.message.id],
                    });
                }
            }

            if (event.type === "message.receipt.updated") {
                event.data.forEach((receipt) => {
                    setMessageReceipt(receipt.messageId, receipt.userId, {
                        deliveredAt: receipt.deliveredAt,
                        readAt: receipt.readAt,
                    });
                });
            }
        },
    });

    useChatSync(connectionCount, sessionPresent === true);

    return (
        <Tabs
            screenOptions={{
                headerShown: false,
                tabBarStyle: { display: 'none' },
            }}
        >
            <Tabs.Screen name="chats" />
            <Tabs.Screen name="settings" />
        </Tabs>
    );
}
