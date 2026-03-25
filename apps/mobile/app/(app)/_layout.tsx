import { Stack } from "expo-router";
import { useEffect, useState } from "react";
import { getValidAccessToken } from "../../src/auth/session";
import useAppWebSocket from "@/src/hooks/useAppWebSocket";
import { useChatStore } from "@/src/store/chatStore";

export default function AppLayout() {
    const [accessToken, setAccessToken] = useState<string | null>(null);

    const appendChat = useChatStore((state) => state.appendChat);
    const appendMessage = useChatStore((state) => state.appendMessage);
    const clearAllChats = useChatStore((state) => state.clearAll);

    useEffect(() => {
        let isActive = true;

        async function loadAccessToken() {
            const token = await getValidAccessToken();

            if (isActive) {
                setAccessToken(token);
            }
        }

        loadAccessToken();

        return () => {
            isActive = false;
            clearAllChats();
        };
    }, [clearAllChats]);

    const { isConnected } = useAppWebSocket({ 
        accessToken, 
        onEvent: (event) => {
            if (event.type === "chat.created") {
                appendChat(event.chat.id, event.chat);
            }

            if (event.type === "message.created") {
                appendMessage(event.message.chat.id, event.message);
            }
        },
    });

    return (
        <Stack>
            <Stack.Screen name="chats/index" options={{ title: isConnected ? "Chats" : "Chats (offline)", headerShown: true }} />
            <Stack.Screen name="chats/[chatId]" options={{ title: "Chat", headerShown: true }} />
        </Stack>
    );
}
