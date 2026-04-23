import { Tabs } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { getValidAccessToken, hasSession } from "../../src/auth/session";
import useAppWebSocket from "@/src/hooks/useAppWebSocket";
import { useUserStore } from "@/src/store/userStore";
import { useChatStore } from "@/src/store/chatStore";
import { markMessagesAsDelivered } from "@/src/api/messages";
import { useChatSync } from "@/src/hooks/useChatSync";
import { getChats } from "@/src/api/chats";

export default function AppLayout() {
    const [sessionPresent, setSessionPresent] = useState<boolean | null>(null);

    const me = useUserStore((state) => state.me);

    const appendChat = useChatStore((state) => state.appendChat);
    const appendMessage = useChatStore((state) => state.appendMessage);
    const setMessageReceipt = useChatStore((state) => state.setMessageReceipt);
    const setChats = useChatStore((state) => state.setChats);

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

    const { connectionCount } = useAppWebSocket({
        getAccessToken: sessionPresent ? getAccessToken : null,
        onEvent: (event) => {
            if (event.type === "chat.created") {
                appendChat(event.chat.id, event.chat);
            }

            if (event.type === "message.created") {
                appendMessage(event.message.chatId, event.message);

                const isOwnMessage = me && event.message.sender.id === me.id;

                if (!isOwnMessage) {
                    const knownChatIds = new Set(
                        useChatStore.getState().chats.map((c) => c.id)
                    );
                    if (!knownChatIds.has(event.message.chatId)) {
                        (async () => {
                            try {
                                const refreshed = await getChats();
                                setChats(refreshed);
                            } catch (e) {
                                console.warn("Failed to refresh chats after unknown-chat message", e);
                            }
                        })();
                    }

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