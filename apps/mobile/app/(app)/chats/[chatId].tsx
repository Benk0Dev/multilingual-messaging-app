import { Message } from "@app/shared-types/models";
import { useEffect, useRef, useState } from "react";
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

export default function ChatScreen() {
    const [myUserId, setMyUserId] = useState<string | null>(null);

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

    const { chatId } = useLocalSearchParams<{ chatId: string }>();

    const [messages, setMessages] = useState<Message[]>([]);
    const [text, setText] = useState("");
    const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

    async function loadMessages() {
        if (!chatId) return;

        const items = await getMessagesForChat(chatId);

        setMessages(items);
    }

    async function sendMessage() {
        const trimmed = text.trim();
        if (!trimmed || !chatId) return;

        setText("");

        await createMessageForChat(chatId, trimmed);
        
        await loadMessages();
    }

    useEffect(() => {
        loadMessages();

        timerRef.current = setInterval(() => {
            loadMessages().catch(() => {});
        }, 1500);

        return () => {
            if (timerRef.current) clearInterval(timerRef.current);
        };
    }, [chatId]);

    return (
        <KeyboardAvoidingView
            style={{ flex: 1 }}
            behavior={Platform.OS === "ios" ? "padding" : undefined}
        >
            <FlatList
                data={messages}
                keyExtractor={(m) => m.id}
                renderItem={({ item }) => {
                const mine = item.sender.id === myUserId;

                return (
                    <View style={{ padding: 8, alignItems: mine ? "flex-end" : "flex-start" }}>
                        <View style={{ maxWidth: "80%", padding: 10, borderRadius: 12, backgroundColor: mine ? "lime" : "white" }}>
                            <Text style={{ fontSize: 12, opacity: 0.7, alignSelf: mine ? "flex-end" : "flex-start" }}>{item.sender.displayName}</Text>
                            <Text style={{ fontSize: 16, alignSelf: mine ? "flex-end" : "flex-start" }}>{item.content.text}</Text>
                            <Text style={{ fontSize: 12, opacity: 0.7, alignSelf: mine ? "flex-end" : "flex-start" }}>{new Date(item.createdAt).toLocaleString("en-GB", { timeStyle: "short" })}</Text>
                        </View>
                    </View>
                );
                }}
            />

            <View style={{ flexDirection: "row", padding: 8, borderTopWidth: 1 }}>
                <TextInput
                    value={text}
                    onChangeText={setText}
                    placeholder="Message"
                    style={{ flex: 1, borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, height: 44 }}
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