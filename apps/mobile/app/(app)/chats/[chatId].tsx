import { useLocalSearchParams } from "expo-router";
import ChatScreenContent from "@/src/features/chat/ChatScreenContent";

export default function ExistingChatRoute() {
    const params = useLocalSearchParams<{
        chatId: string;
        peerId: string;
        peerUsername: string;
        peerDisplayName: string;
        peerPictureUrl?: string;
        peerPreferredLang: string;
    }>();

    const { chatId, peerId, peerUsername, peerDisplayName, peerPictureUrl, peerPreferredLang } = params;

    if (!chatId || !peerId || !peerUsername || !peerDisplayName || !peerPreferredLang) {
        return null;
    }

    if (!chatId) {
        return null;
    }

    return (
        <ChatScreenContent
            mode="existing"
            chatId={chatId}
            peer={{
                id: peerId,
                username: peerUsername,
                displayName: peerDisplayName,
                pictureUrl: peerPictureUrl ?? null,
                preferredLang: peerPreferredLang,
            }}
        />
    );
}