import { useEffect, useState } from "react";
import {
    FlatList,
    KeyboardAvoidingView,
    Platform,
    Pressable,
    Text,
    TextInput,
    View,
} from "react-native";
import { useLocalSearchParams } from "expo-router";
import { getMessagesForChat, createMessageForChat } from "@/src/api/messages";
import { getMe } from "@/src/api/users";
import { useChatStore } from "@/src/store/chatStore";
import type { Message } from "@app/shared-types/models";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const EMPTY_MESSAGES: Message[] = [];

export default function ChatScreen() {
    const insets = useSafeAreaInsets();

    const [myUserId, setMyUserId] = useState<string | null>(null);
    const [text, setText] = useState("");

    const { chatId } = useLocalSearchParams<{ chatId: string }>();

    const messages = useChatStore((state) => state.messagesByChatId[chatId] ?? EMPTY_MESSAGES);
    const isLoaded = useChatStore((state) => state.loadedChatIds[chatId] ?? false);
    const setMessagesForChat = useChatStore((state) => state.setMessagesForChat);
    const appendMessage = useChatStore((state) => state.appendMessage);

    useEffect(() => {
        (async () => {
            try {
                const res = await getMe();
                setMyUserId(res.user.id);
            } catch (e: any) {
                console.error(e);
            }
        })();
    }, []);

    useEffect(() => {
        async function loadMessages() {
            if (!chatId || isLoaded) return;

            try {
                const items = await getMessagesForChat(chatId);
                setMessagesForChat(chatId, items);
            } catch (e: any) {
                console.error(e);
            }
        }

        loadMessages();
    }, [chatId, isLoaded, setMessagesForChat]);

    async function sendMessage() {
        const trimmed = text.trim();
        if (!trimmed || !chatId) return;

        setText("");

        try {
            const message = await createMessageForChat(chatId, trimmed);
            appendMessage(chatId, message);
        } catch (e: any) {
            console.error(e);
        }
    }

    return (
        <KeyboardAvoidingView
            style={{ flex: 1 }}
            behavior={Platform.OS === "ios" ? "padding" : undefined}
        >
            <FlatList
                data={[...messages].reverse()}
                keyExtractor={(m) => m.id}
                inverted
                renderItem={({ item }) => {
                    const mine = item.sender.id === myUserId;

                    return (
                        <View style={{ padding: 8, alignItems: mine ? "flex-end" : "flex-start" }}>
                            <View style={{ maxWidth: "80%", padding: 10, borderRadius: 12, backgroundColor: mine ? "skyblue" : "white" }}>
                                <Text style={{ fontSize: 12, opacity: 0.7, alignSelf: mine ? "flex-end" : "flex-start" }}>{item.sender.displayName}</Text>
                                <Text style={{ fontSize: 16, alignSelf: mine ? "flex-end" : "flex-start" }}>{item.content.text}</Text>
                                <Text style={{ fontSize: 12, opacity: 0.7, alignSelf: mine ? "flex-end" : "flex-start" }}>{new Date(item.createdAt).toLocaleString("en-GB", { timeStyle: "short" })}</Text>
                            </View>
                        </View>
                    );
                }}
            />

            <View style={{ flexDirection: "row", paddingHorizontal: 12, paddingVertical: 8, paddingBottom: 8 + insets.bottom, borderTopWidth: 1 }}>
                <TextInput
                    value={text}
                    onChangeText={setText}
                    placeholder="Message"
                    style={{ flex: 1, borderWidth: 1, borderRadius: 10, paddingHorizontal: 8, paddingVertical: 8 }}
                />
                <Pressable
                    onPress={() => sendMessage().catch(() => {})}
                    style={{ marginLeft: 8, paddingHorizontal: 14, justifyContent: "center" }}
                >
                <Text style={{ fontWeight: "600" }}>Send</Text>
                </Pressable>
            </View>
        </KeyboardAvoidingView>
    );
}