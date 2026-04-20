import { useLocalSearchParams } from "expo-router";
import ChatScreenContent from "@/src/features/chat/ChatScreenContent";
import { createChatAndSendFirstMessage } from "@/src/api/chats";

export default function NewChatRoute() {
    const params = useLocalSearchParams<{
        peerId: string;
        peerUsername: string;
        peerDisplayName: string;
        peerPictureUrl?: string;
        peerPreferredLang: string;
        peerCreatedAt: string;
    }>();

    const {
        peerId,
        peerUsername,
        peerDisplayName,
        peerPictureUrl,
        peerPreferredLang,
        peerCreatedAt,
    } = params;

    if (!peerId || !peerUsername || !peerDisplayName || !peerPreferredLang || !peerCreatedAt) {
        return null;
    }

    return (
        <ChatScreenContent
            mode="draft"
            peer={{
                id: peerId,
                username: peerUsername,
                displayName: peerDisplayName,
                pictureUrl: peerPictureUrl ?? null,
                preferredLang: peerPreferredLang,
                createdAt: peerCreatedAt,
            }}
            onSendFirstMessage={async (input) => {
                const data = await createChatAndSendFirstMessage({
                    userIds: [input.userId],
                    content: { text: input.text },
                    clientId: input.clientId,
                });
                return data;
            }}
        />
    );
}
