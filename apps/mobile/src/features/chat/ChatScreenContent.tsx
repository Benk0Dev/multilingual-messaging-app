import { useEffect, useMemo, useState } from "react";
import {
    FlatList,
    KeyboardAvoidingView,
    Platform,
    Pressable,
    StyleSheet,
    Text,
    TextInput,
    View,
} from "react-native";
import { useHeaderHeight } from "@react-navigation/elements";
import { getMessagesForChat, createMessageForChat } from "@/src/api/messages";
import { getMe } from "@/src/api/users";
import { useChatStore } from "@/src/store/chatStore";
import type { Chat, Message } from "@app/shared-types/models";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const EMPTY_MESSAGES: Message[] = [];

type DraftUser = {
    id: string;
    username: string;
    displayName: string;
    pictureUrl: string | null;
};

type ExistingModeProps = {
    mode: "existing";
    chatId: string;
};

type DraftModeProps = {
    mode: "draft";
    draftUser: DraftUser;
    onSendFirstMessage: (input: {
        userId: string;
        text: string;
    }) => Promise<{ chat: Chat, message: Message }>;
};

type Props = ExistingModeProps | DraftModeProps;

export default function ChatScreenContent(props: Props) {
    const insets = useSafeAreaInsets();
    const headerHeight = useHeaderHeight();

    const [myUserId, setMyUserId] = useState<string | null>(null);
    const [activeChatId, setActiveChatId] = useState<string | null>(
        props.mode === "existing" ? props.chatId : null
    );
    const [text, setText] = useState("");
    const [isSending, setIsSending] = useState(false);

    const isLiveChat = useMemo(() => Boolean(activeChatId), [activeChatId]);

    const messages = useChatStore((state) => 
        activeChatId ? state.messagesByChatId[activeChatId] ?? EMPTY_MESSAGES : EMPTY_MESSAGES
    );
    const isLoaded = useChatStore((state) => 
        activeChatId ? state.loadedChatIds[activeChatId] ?? false : false
    );
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
            if (!activeChatId || isLoaded) return;

            try {
                const items = await getMessagesForChat(activeChatId);
                setMessagesForChat(activeChatId, items);
            } catch (e) {
                console.error(e);
            }
        }

        loadMessages();
    }, [activeChatId, isLoaded, setMessagesForChat]);

    const reversedMessages = useMemo(() => [...messages].reverse(), [messages]);

    async function sendMessage() {
        const trimmed = text.trim();
        if (!trimmed || isSending) return;

        setText("");
        setIsSending(true);

        try {
            // Existing chat
            if (isLiveChat) {
                const message = await createMessageForChat(activeChatId!, trimmed);
                appendMessage(activeChatId!, message);
                return;
            }
            
            // Draft -> create chat + first message
            if (props.mode === "draft") {
                const { chat, message } = await props.onSendFirstMessage({
                    userId: props.draftUser.id,
                    text: trimmed,
                });

                // Promote to live chat
                setActiveChatId(chat.id);

                // Set messages for new chat
                setMessagesForChat(chat.id, [message]);

                return;
            }
        } catch (e) {
            console.error(e);
            setText(trimmed);
        } finally {
            setIsSending(false);
        }
    }

    return (
        <KeyboardAvoidingView
            style={styles.container}
            behavior={Platform.OS === "ios" ? "padding" : "height"}
            keyboardVerticalOffset={Platform.OS === "ios" ? headerHeight : 0}
        >
            <FlatList
                style={styles.messageList}
                contentContainerStyle={styles.messageListContent}
                data={reversedMessages}
                keyExtractor={(m) => m.id}
                inverted
                keyboardShouldPersistTaps="handled"
                ListEmptyComponent={
                    <View style={styles.emptyState}>
                        <Text style={styles.emptyStateText}>No messages yet</Text>
                    </View>
                }
                renderItem={({ item }) => {
                    const mine = item.sender.id === myUserId;

                    return (
                        <View style={[styles.row, mine ? styles.rowMine : styles.rowOther]}>
                            <View style={[styles.bubble, mine ? styles.bubbleMine : styles.bubbleOther]}>
                                <Text style={[styles.sender, mine ? styles.senderMine : styles.senderOther]}>
                                    {item.sender.displayName}
                                </Text>
                                {item.content.translation ? (
                                    <>
                                        <Text style={[styles.messageText, styles.originalText, mine ? styles.textMine : styles.textOther]}>
                                            {item.content.text}
                                        </Text>
                                        <Text style={[styles.messageText, mine ? styles.textMine : styles.textOther]}>
                                            {item.content.translation.translatedText}
                                        </Text>
                                    </>
                                ) : (
                                    <Text style={[styles.messageText, mine ? styles.textMine : styles.textOther]}>
                                        {item.content.text}
                                    </Text>
                                )}
                                <Text style={[styles.timeText, mine ? styles.timeMine : styles.timeOther]}>
                                    {new Date(item.createdAt).toLocaleString("en-GB", { timeStyle: "short" })}
                                </Text>
                            </View>
                        </View>
                    );
                }}
            />

            <View
                style={[
                    styles.composerContainer,
                    {
                        paddingBottom: 8 + insets.bottom,
                    },
                ]}
            >
                <TextInput
                    value={text}
                    onChangeText={setText}
                    placeholder="Message"
                    placeholderTextColor="#8A8F98"
                    style={styles.input}
                />
                <Pressable
                    onPress={() => sendMessage().catch(() => {})}
                    style={({ pressed }) => [
                        styles.sendButton,
                        !text.trim() && styles.sendButtonDisabled,
                        pressed && styles.sendButtonPressed,
                    ]}
                >
                    <Text style={styles.sendButtonText}>Send</Text>
                </Pressable>
            </View>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: "#F4F6F9",
    },
    draftInfoContainer: {
        paddingHorizontal: 16,
        paddingTop: 14,
        paddingBottom: 10,
        backgroundColor: "#FFFFFF",
        borderBottomWidth: StyleSheet.hairlineWidth,
        borderBottomColor: "#D8DEE8",
    },
    draftInfoTitle: {
        fontSize: 16,
        fontWeight: "700",
        color: "#121926",
    },
    draftInfoSubtitle: {
        fontSize: 14,
        color: "#667085",
        marginTop: 2,
    },
    draftInfoHint: {
        fontSize: 13,
        color: "#667085",
        marginTop: 8,
    },
    messageList: {
        flex: 1,
    },
    messageListContent: {
        paddingHorizontal: 10,
        paddingTop: 10,
        paddingBottom: 6,
    },
    emptyState: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        paddingTop: 40,
    },
    emptyStateText: {
        color: "#667085",
        fontSize: 14,
    },
    row: {
        paddingVertical: 4,
        paddingHorizontal: 2,
    },
    rowMine: {
        alignItems: "flex-end",
    },
    rowOther: {
        alignItems: "flex-start",
    },
    bubble: {
        maxWidth: "84%",
        borderRadius: 18,
        paddingHorizontal: 12,
        paddingTop: 8,
        paddingBottom: 6,
        shadowColor: "#000",
        shadowOpacity: 0.08,
        shadowRadius: 6,
        shadowOffset: { width: 0, height: 1 },
        elevation: 1,
    },
    bubbleMine: {
        backgroundColor: "#2F80ED",
        borderBottomRightRadius: 6,
    },
    bubbleOther: {
        backgroundColor: "#FFFFFF",
        borderBottomLeftRadius: 6,
        borderWidth: 1,
        borderColor: "#E5E9F0",
    },
    sender: {
        fontSize: 12,
        marginBottom: 2,
        fontWeight: "600",
    },
    senderMine: {
        color: "rgba(255,255,255,0.88)",
        textAlign: "right",
    },
    senderOther: {
        color: "#667085",
        textAlign: "left",
    },
    messageText: {
        fontSize: 16,
        lineHeight: 22,
    },
    originalText: {
        textDecorationLine: "line-through",
        opacity: 0.8,
        marginBottom: 2,
    },
    textMine: {
        color: "#FFFFFF",
        textAlign: "right",
    },
    textOther: {
        color: "#121926",
        textAlign: "left",
    },
    timeText: {
        fontSize: 11,
        marginTop: 4,
    },
    timeMine: {
        color: "rgba(255,255,255,0.72)",
        textAlign: "right",
    },
    timeOther: {
        color: "#667085",
        textAlign: "left",
    },
    composerContainer: {
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
        paddingHorizontal: 10,
        paddingTop: 8,
        borderTopWidth: StyleSheet.hairlineWidth,
        borderTopColor: "#D8DEE8",
        backgroundColor: "#FFFFFF",
    },
    input: {
        flex: 1,
        minHeight: 42,
        maxHeight: 120,
        backgroundColor: "#F7F9FC",
        borderWidth: 1,
        borderColor: "#D8DEE8",
        borderRadius: 22,
        paddingHorizontal: 14,
        paddingVertical: 10,
        color: "#121926",
        fontSize: 15,
    },
    sendButton: {
        minHeight: 42,
        paddingHorizontal: 16,
        borderRadius: 21,
        backgroundColor: "#2F80ED",
        alignItems: "center",
        justifyContent: "center",
    },
    sendButtonDisabled: {
        opacity: 0.65,
    },
    sendButtonPressed: {
        opacity: 0.85,
    },
    sendButtonText: {
        color: "#FFFFFF",
        fontSize: 15,
        fontWeight: "700",
    },
});