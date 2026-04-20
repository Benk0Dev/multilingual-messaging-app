import { Tabs } from "expo-router";
import { useEffect, useState } from "react";
import { getValidAccessToken } from "../../src/auth/session";
import useAppWebSocket from "@/src/hooks/useAppWebSocket";
import { useUserStore } from "@/src/store/userStore";
import { useChatStore } from "@/src/store/chatStore";
import { markMessagesAsDelivered } from "@/src/api/messages";
import { useChatSync } from "@/src/hooks/useChatSync";
import { getChats } from "@/src/api/chats";

export default function AppLayout() {
    const [accessToken, setAccessToken] = useState<string | null>(null);

    const me = useUserStore((state) => state.me);

    const appendChat = useChatStore((state) => state.appendChat);
    const appendMessage = useChatStore((state) => state.appendMessage);
    const setMessageReceipt = useChatStore((state) => state.setMessageReceipt);
    const setChats = useChatStore((state) => state.setChats);

    // Load access token for WebSocket connection
    useEffect(() => {
        let isActive = true;
        (async () => {
            const token = await getValidAccessToken();
            if (isActive) setAccessToken(token);
        })();
        return () => {
            isActive = false;
        };
    }, []);

        const { connectionCount } = useAppWebSocket({
        accessToken,
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

    useChatSync(connectionCount, Boolean(accessToken));

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
