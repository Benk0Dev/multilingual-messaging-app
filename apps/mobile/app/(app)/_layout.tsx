import { Stack } from "expo-router";
import { useEffect, useState } from "react";
import { getValidAccessToken } from "../../src/auth/session";
import useAppWebSocket from "@/src/hooks/useAppWebSocket";
import { useChatStore } from "@/src/store/chatStore";

export default function AppLayout() {
    const [accessToken, setAccessToken] = useState<string | null>(null);
    const appendMessage = useChatStore((state) => state.appendMessage);

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
        };
    }, []);

    const { isConnected } = useAppWebSocket({ 
        accessToken, 
        onEvent: (event) => {
            if (event.type === "message.created") {
                appendMessage(event.message.chat.id, event.message);
            }
        },
    });

    return (
        <Stack>
            <Stack.Screen name="chats/index" options={{ title: "Chats", headerShown: true }} />
            <Stack.Screen name="chats/[chatId]" options={{ title: "Chat", headerShown: true }} />
        </Stack>
    );
}
