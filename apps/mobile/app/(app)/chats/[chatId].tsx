import { Stack, useLocalSearchParams } from "expo-router";
import ChatScreenContent from "@/src/features/chat/ChatScreenContent";

export default function ExistingChatRoute() {
    const { chatId, title } = useLocalSearchParams<{ chatId: string, title: string }>();

    if (!chatId) {
        return null;
    }

    return (
        <>
            <Stack.Screen options={{ title: title ?? "Chat" }} />
            <ChatScreenContent mode="existing" chatId={chatId} />
        </>
    );
}