import { Tabs } from "expo-router";
import { useEffect, useState } from "react";
import { getValidAccessToken } from "../../src/auth/session";
import useAppWebSocket from "@/src/hooks/useAppWebSocket";
import { useUserStore } from "@/src/store/userStore";
import { useChatStore } from "@/src/store/chatStore";
import { markMessagesAsDelivered } from "@/src/api/messages";
import { getMe } from "@/src/api/users";

export default function AppLayout() {
    const [accessToken, setAccessToken] = useState<string | null>(null);

    const me = useUserStore((state) => state.me);
    const setMe = useUserStore((state) => state.setMe);

    const appendChat = useChatStore((state) => state.appendChat);
    const appendMessage = useChatStore((state) => state.appendMessage);
    const setMessageReceipt = useChatStore((state) => state.setMessageReceipt);
    const clearAllChats = useChatStore((state) => state.clearAll);

    // Load current user once
    useEffect(() => {
        (async () => {
            try {
                const res = await getMe();
                setMe(res.user);
            } catch (error) {
                console.error('Failed to load user', error);
            }
        })();
    }, [setMe]);

    // Load access token for WebSocket connection
    useEffect(() => {
        let isActive = true;
        (async () => {
            const token = await getValidAccessToken();
            if (isActive) setAccessToken(token);
        })();
        return () => {
            isActive = false;
            clearAllChats();
        };
    }, [clearAllChats]);

    useAppWebSocket({
        accessToken,
        onEvent: (event) => {
            if (event.type === "chat.created") {
                appendChat(event.chat.id, event.chat);
            }

            if (event.type === "message.created") {
                appendMessage(event.message.chat.id, event.message);

                if (me && event.message.sender.id !== me.id) {
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
