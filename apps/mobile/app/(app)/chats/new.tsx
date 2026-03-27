import { Stack, useLocalSearchParams } from "expo-router";
import ChatScreenContent from "@/src/features/chat/ChatScreenContent";
import { createChatAndSendFirstMessage } from "@/src/api/chats";

export default function NewChatRoute() {
    const params = useLocalSearchParams<{
        userId: string;
        username: string;
        displayName: string;
        pictureUrl?: string;
    }>();

    const userId = params.userId;
    const username = params.username;
    const displayName = params.displayName;
    const pictureUrl = params.pictureUrl;

    if (!userId || !username || !displayName) {
        return null;
    }

    return (
        <>
            <Stack.Screen options={{ title: displayName }} />
            <ChatScreenContent
                mode="draft"
                draftUser={{
                    id: userId,
                    username,
                    displayName,
                    pictureUrl: pictureUrl ?? null,
                }}
                onSendFirstMessage={async (input: {
                    userId: string;
                    text: string;
                }) => {
                    const data = await createChatAndSendFirstMessage({
                        userIds: [input.userId],
                        content: {
                            text: input.text,
                        },
                    });
                    return data;
                }}
            />
        </>
    );
}