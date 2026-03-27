import { useEffect, useMemo, useRef, useState } from "react";
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
import { Ionicons } from "@expo/vector-icons";
import { useHeaderHeight } from "@react-navigation/elements";
import { getMessagesForChat, createMessageForChat, markMessagesAsRead } from "@/src/api/messages";
import { getMe } from "@/src/api/users";
import { useChatStore } from "@/src/store/chatStore";
import type { Chat, Message } from "@app/shared-types/models";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const EMPTY_MESSAGES: Message[] = [];

const PENDING_OUTGOING_ID = "__pending_outgoing__";

type OutboundReceiptStatus = "none" | "sent" | "delivered" | "read";

function getOutboundReceiptStatus(message: Message, myUserId: string | null): OutboundReceiptStatus {
    if (!myUserId || message.sender.id !== myUserId) return "sent";
    const recipients = (message.receipts ?? []).filter((r) => r.userId !== message.sender.id);
    if (recipients.length === 0) return "sent";
    if (recipients.every((r) => r.readAt)) return "read";
    if (recipients.every((r) => r.deliveredAt)) return "delivered";
    return "sent";
}

function ReceiptTicks({ status }: { status: OutboundReceiptStatus }) {
    if (status === "none") return null;

    const isDouble = status === "delivered" || status === "read";
    const tickColor = status === "read" ? "#72ff36" : "rgba(255,255,255,0.72)";

    if (!isDouble) {
        return <Ionicons name="checkmark" size={14} color={tickColor} />;
    }

    return (
        <View style={styles.tickDouble}>
            <Ionicons name="checkmark" size={14} color={tickColor} style={styles.tickOverlap} />
            <Ionicons name="checkmark" size={14} color={tickColor} />
        </View>
    );
}

function buildPendingOutgoingMessage(text: string, myUserId: string, chatId: string): Message {
    return {
        id: PENDING_OUTGOING_ID,
        chat: { id: chatId },
        sender: { id: myUserId, username: "", displayName: "" },
        content: {
            id: "",
            text,
            originalLang: "",
        },
        receipts: [],
        isDeleted: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
    };
}

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
    const [pendingOutgoingText, setPendingOutgoingText] = useState<string | null>(null);

    const isLiveChat = useMemo(() => Boolean(activeChatId), [activeChatId]);

    const messages = useChatStore((state) => 
        activeChatId ? state.messagesByChatId[activeChatId] ?? EMPTY_MESSAGES : EMPTY_MESSAGES
    );
    const isLoaded = useChatStore((state) => 
        activeChatId ? state.loadedChatIds[activeChatId] ?? false : false
    );
    const appendChat = useChatStore((state) => state.appendChat);
    const setMessagesForChat = useChatStore((state) => state.setMessagesForChat);
    const appendMessage = useChatStore((state) => state.appendMessage);
    const setMessageReceipt = useChatStore((state) => state.setMessageReceipt);
    // Prevent duplicate "mark read" calls for the same messages while we're on this screen.
    const readAckedMessageIdsRef = useRef<Set<string>>(new Set());
    const inFlightReadMessageIdsRef = useRef<Set<string>>(new Set());

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
                const items = await getMessagesForChat({ 
                    chatId: activeChatId, 
                    limit: 30,
                });
                setMessagesForChat(activeChatId, items);
            } catch (e) {
                console.error(e);
            }
        }

        loadMessages();
    }, [activeChatId, isLoaded, setMessagesForChat]);

    // Reset local read-ack tracking whenever we switch chats.
    useEffect(() => {
        if (!activeChatId) return;
        readAckedMessageIdsRef.current.clear();
        inFlightReadMessageIdsRef.current.clear();
    }, [activeChatId, readAckedMessageIdsRef]);

    function messageIsReadForUser(message: Message, userId: string): boolean {
        return (
            message.receipts?.some((r) => r.userId === userId && Boolean(r.readAt)) ?? false
        );
    }

    // Mark unread messages as read:
    // - On entering a chat: includes all messages in the current store that are unread for me.
    // - While receiving: websocket updates append messages; this effect runs and only a new unread message gets acked.
    useEffect(() => {
        if (!activeChatId || !myUserId) return;
        if (messages.length === 0) return;

        const candidates = messages
            .filter((m) => m.sender.id !== myUserId)
            .filter((m) => !messageIsReadForUser(m, myUserId))
            .map((m) => m.id)
            .filter((id) => !readAckedMessageIdsRef.current.has(id));

        const candidatesNotInFlight = candidates.filter(
            (id) => !inFlightReadMessageIdsRef.current.has(id)
        );

        if (candidatesNotInFlight.length === 0) return;

        let cancelled = false;
        (async () => {
            try {
                candidatesNotInFlight.forEach((id) => inFlightReadMessageIdsRef.current.add(id));

                await markMessagesAsRead({ messageIds: candidatesNotInFlight });
                if (cancelled) return;
                const readAt = new Date().toISOString();
                candidatesNotInFlight.forEach((id) => {
                    setMessageReceipt(id, myUserId, { readAt });
                    readAckedMessageIdsRef.current.add(id);
                    inFlightReadMessageIdsRef.current.delete(id);
                });
            } catch (e) {
                // Non-fatal: we can retry on the next websocket append / re-render.
                console.error(e);
                candidatesNotInFlight.forEach((id) => inFlightReadMessageIdsRef.current.delete(id));
            }
        })();

        return () => {
            cancelled = true;
        };
    }, [activeChatId, myUserId, messages, readAckedMessageIdsRef, setMessageReceipt]);

    const listData = useMemo(() => {
        const rev = [...messages].reverse();
        const canShowPending =
            Boolean(pendingOutgoingText && myUserId) &&
            (Boolean(activeChatId) || props.mode === "draft");
        if (canShowPending && pendingOutgoingText && myUserId) {
            const chatIdForPending = activeChatId ?? "draft";
            return [buildPendingOutgoingMessage(pendingOutgoingText, myUserId, chatIdForPending), ...rev];
        }
        return rev;
    }, [messages, pendingOutgoingText, myUserId, activeChatId, props.mode]);

    async function sendMessage() {
        const trimmed = text.trim();
        if (!trimmed || isSending) return;

        setText("");
        setPendingOutgoingText(trimmed);
        setIsSending(true);

        try {
            // Existing chat
            if (isLiveChat) {
                const message = await createMessageForChat({ 
                    chatId: activeChatId!, 
                    content: { 
                        text: trimmed,
                    },
                });
                appendMessage(activeChatId!, message);
                setPendingOutgoingText(null);
                return;
            }
            
            // Draft -> create chat + first message
            if (props.mode === "draft") {
                const { chat, message } = await props.onSendFirstMessage({
                    userId: props.draftUser.id,
                    text: trimmed,
                });


                setActiveChatId(chat.id);
                appendChat(chat.id, chat);
                appendMessage(chat.id, message);
                setPendingOutgoingText(null);

                return;
            }
        } catch (e) {
            console.error(e);
            setText(trimmed);
            setPendingOutgoingText(null);
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
                data={listData}
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
                    const isPendingOutgoing = item.id === PENDING_OUTGOING_ID;
                    const receiptStatus = isPendingOutgoing
                        ? "none"
                        : mine
                          ? getOutboundReceiptStatus(item, myUserId)
                          : "sent";

                    return (
                        <View style={[styles.row, mine ? styles.rowMine : styles.rowOther]}>
                            <View
                                style={[
                                    styles.bubble,
                                    mine ? styles.bubbleMine : styles.bubbleOther,
                                    isPendingOutgoing && styles.bubblePending,
                                ]}
                            >
                                {!isPendingOutgoing ? (
                                    <Text style={[styles.sender, mine ? styles.senderMine : styles.senderOther]}>
                                        {item.sender.displayName}
                                    </Text>
                                ) : null}
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
                                {mine ? (
                                    <View style={styles.mineMetaRow}>
                                        <Text style={styles.timeMineInline}>
                                            {new Date(item.createdAt).toLocaleString("en-GB", { timeStyle: "short" })}
                                        </Text>
                                        <ReceiptTicks status={receiptStatus} />
                                    </View>
                                ) : (
                                    <Text style={[styles.timeText, styles.timeOther]}>
                                        {new Date(item.createdAt).toLocaleString("en-GB", { timeStyle: "short" })}
                                    </Text>
                                )}
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
    bubblePending: {
        opacity: 0.88,
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
    mineMetaRow: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "flex-end",
        marginTop: 4,
        gap: 4,
    },
    timeMineInline: {
        fontSize: 11,
        color: "rgba(255,255,255,0.72)",
    },
    tickDouble: {
        flexDirection: "row",
        alignItems: "center",
    },
    tickOverlap: {
        marginRight: -9,
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