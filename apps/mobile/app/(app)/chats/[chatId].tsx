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
import { getMessagesForChat, sendMessage } from "@/src/api/messages";
import { getDevUserId } from "../../../src/devUser";

export default function ChatScreen() {
    const [devUserId, setDevUserIdState] = useState<string>("");

    useEffect(() => {
        (async () => {
            const id = await getDevUserId();
            setDevUserIdState(id ?? "");
        })();
    }, []);

    const { chatId } = useLocalSearchParams<{ chatId: string }>();

    console.log("chatId:", chatId);

    const [messages, setMessages] = useState<Message[]>([]);
    const [text, setText] = useState("");
    const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

    async function loadMessages() {
        if (!chatId) return;

        const items = await getMessagesForChat(chatId);
        console.log("Loaded messages:", items);

        setMessages(items);
    }

    async function createMessage() {
        const trimmed = text.trim();
        if (!trimmed || !chatId) return;

        setText("");

        await sendMessage(chatId, devUserId, trimmed);

        await loadMessages();
    }

    console.log(messages)

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
                const mine = item.sender.id === devUserId;

                return (
                    <View style={{ padding: 8, alignItems: mine ? "flex-end" : "flex-start" }}>
                        <View style={{ maxWidth: "80%", padding: 10, borderWidth: 1, borderRadius: 12 }}>
                            <Text style={{ fontSize: 12, opacity: 0.7 }}>{item.sender.displayName}</Text>
                            <Text style={{ fontSize: 16 }}>{item.content.text}</Text>
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
                    onPress={() => createMessage().catch(() => {})}
                    style={{ marginLeft: 8, paddingHorizontal: 14, justifyContent: "center" }}
                >
                <Text style={{ fontWeight: "600" }}>Send</Text>
                </Pressable>
            </View>
        </KeyboardAvoidingView>
    );
}