import { useEffect, useMemo, useRef, useState } from "react";
import {
    FlatList,
    Platform,
    StyleSheet,
    View,
} from "react-native";
import { KeyboardAvoidingView } from "react-native-keyboard-controller";
import { getMessagesForChat, createMessageForChat, markMessagesAsRead } from "@/src/api/messages";
import { useChatStore } from "@/src/store/chatStore";
import { useUserStore } from "@/src/store/userStore";
import { useTheme } from "@/src/theme";
import { Text } from "@/src/components/ui/Text";
import { DetailedScreenHeader as ScreenHeader } from "@/src/components/ui/DetailedScreenHeader";
import { MessageBubble } from "@/src/components/chat/MessageBubble";
import { MessageInput } from "@/src/components/chat/MessageInput";
import {
    computeGroupFlags,
    computeDatePillFlags,
    getReceiptStatus,
} from "@/src/utils/messages";
import type { Chat, Message, User } from "@app/shared-types/models";
import { LanguageCode, LanguageDisplayName } from "@app/shared-types/enums";
import { DatePill } from "@/src/components/chat/DatePill";
import { formatChatDatePill } from "@/src/utils/dateFormat";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const EMPTY_MESSAGES: Message[] = [];
const PENDING_OUTGOING_ID = "__pending_outgoing__";

function buildPendingOutgoingMessage(
    text: string,
    myUserId: string,
    chatId: string
): Message {
    return {
        id: PENDING_OUTGOING_ID,
        chatId: chatId,
        sender: { id: myUserId, username: "", displayName: "", preferredLang: "", createdAt: new Date().toISOString() },
        content: { id: "", text, originalLang: "" },
        receipts: [],
        isDeleted: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
    };
}

function messageIsReadForUser(message: Message, userId: string): boolean {
    return (
        message.receipts?.some((r) => r.userId === userId && Boolean(r.readAt)) ??
        false
    );
}

type Peer = Omit<User, "createdAt">

type ExistingModeProps = {
    mode: "existing";
    chatId: string;
    peer: Peer;
};

type DraftModeProps = {
    mode: "draft";
    peer: Peer;
    onSendFirstMessage: (input: {
        userId: string;
        text: string;
    }) => Promise<{ chat: Chat; message: Message }>;
};

type Props = ExistingModeProps | DraftModeProps;

export default function ChatScreenContent(props: Props) {
    const { colors, spacing } = useTheme();
    const insets = useSafeAreaInsets();

    const [activeChatId, setActiveChatId] = useState<string | null>(
        props.mode === "existing" ? props.chatId : null
    );
    const [text, setText] = useState("");
    const [isSending, setIsSending] = useState(false);
    const [pendingOutgoingText, setPendingOutgoingText] = useState<string | null>(
        null
    );

    const isLiveChat = useMemo(() => Boolean(activeChatId), [activeChatId]);

    const messages = useChatStore((s) =>
        activeChatId
            ? s.messagesByChatId[activeChatId] ?? EMPTY_MESSAGES
            : EMPTY_MESSAGES
    );
    const isLoaded = useChatStore((s) =>
        activeChatId ? s.loadedChatIds[activeChatId] ?? false : false
    );
    const appendChat = useChatStore((s) => s.appendChat);
    const setMessagesForChat = useChatStore((s) => s.setMessagesForChat);
    const appendMessage = useChatStore((s) => s.appendMessage);
    const setMessageReceipt = useChatStore((s) => s.setMessageReceipt);

    const me = useUserStore((state) => state.me);

    // Track messages that have been read and are in flight (read receipts are in progress of being ACKed by the server)
    const readAckedMessageIdsRef = useRef<Set<string>>(new Set());
    const inFlightReadMessageIdsRef = useRef<Set<string>>(new Set());

    // Load messages for the chat
    useEffect(() => {
        (async () => {
            if (!activeChatId || isLoaded) return;
            try {
                const items = await getMessagesForChat({
                    chatId: activeChatId,
                    limit: 100,  // TODO: pagination
                });
                setMessagesForChat(activeChatId, items);
            } catch (e) {
                console.error(e);
            }
        })();
    }, [activeChatId, isLoaded, setMessagesForChat]);

    // Clear read and in flight message IDs when opening a new chat
    useEffect(() => {
        if (!activeChatId) return;
        readAckedMessageIdsRef.current.clear();
        inFlightReadMessageIdsRef.current.clear();
    }, [activeChatId]);

    // Mark messages as read when opening the chat
    useEffect(() => {
        if (!activeChatId || !me || messages.length === 0) return;

        const candidates = messages
            .filter((m) => m.sender.id !== me.id)
            .filter((m) => !messageIsReadForUser(m, me.id))
            .map((m) => m.id)
            .filter((id) => !readAckedMessageIdsRef.current.has(id));

        const candidatesNotInFlight = candidates.filter(
            (id) => !inFlightReadMessageIdsRef.current.has(id)
        );

        if (candidatesNotInFlight.length === 0) return;

        let cancelled = false;
        (async () => {
            try {
                candidatesNotInFlight.forEach((id) =>
                    inFlightReadMessageIdsRef.current.add(id)
                );
                await markMessagesAsRead({ messageIds: candidatesNotInFlight });
                if (cancelled) return;
                const readAt = new Date().toISOString();
                candidatesNotInFlight.forEach((id) => {
                    setMessageReceipt(id, me.id, { readAt });
                    readAckedMessageIdsRef.current.add(id);
                    inFlightReadMessageIdsRef.current.delete(id);
                });
            } catch (e) {
                console.error(e);
                candidatesNotInFlight.forEach((id) =>
                    inFlightReadMessageIdsRef.current.delete(id)
                );
            }
        })();

        return () => {
            cancelled = true;
        };
    }, [activeChatId, me, messages, setMessageReceipt]);

    // Build the list data for the chat
    const listData = useMemo(() => {
        const canShowPending =
            Boolean(pendingOutgoingText && me) &&
            (Boolean(activeChatId) || props.mode === "draft");

        const grouped = computeGroupFlags(messages).reverse();
        const withDatePills = computeDatePillFlags(grouped);

        if (!canShowPending || !pendingOutgoingText || !me) {
            return withDatePills;
        }

        const chatIdForPending = activeChatId ?? "draft";
        const pending = buildPendingOutgoingMessage(
            pendingOutgoingText,
            me.id,
            chatIdForPending
        );

        return [
            {
                ...pending,
                isFirstInGroup: true,
                isLastInGroup: true,
                showDatePill: false,
            },
            ...withDatePills,
        ];
    }, [messages, pendingOutgoingText, me, activeChatId, props.mode]);

    async function sendMessage() {
        if (!text || isSending) return;  // TODO: change so that sending multiple messages is supported

        setText("");
        setPendingOutgoingText(text);
        setIsSending(true);

        try {
            if (isLiveChat) {
                const message = await createMessageForChat({
                    chatId: activeChatId!,
                    content: { text },
                });
                appendMessage(activeChatId!, message);
                setPendingOutgoingText(null);
                return;
            }

            if (props.mode === "draft") {
                setActiveChatId("__creating_chat__");  // So that the UI updates immediately
                const { chat, message } = await props.onSendFirstMessage({
                    userId: props.peer.id,
                    text,
                });
                setActiveChatId(chat.id);
                appendChat(chat.id, chat);
                appendMessage(chat.id, message);
                setPendingOutgoingText(null);
                return;
            }
        } catch (e) {
            console.error(e);
            setText(text);
            setPendingOutgoingText(null);
            setActiveChatId(null);
        } finally {
            setIsSending(false);
        }
    }

    return (
        <View style={styles.container}>
            <ScreenHeader
                title={props.peer.displayName}
                subtitle={`Speaks ${LanguageDisplayName[props.peer.preferredLang as LanguageCode]}`}
                avatarName={props.peer.displayName}
                avatarImageUrl={props.peer.pictureUrl}
                avatarUserId={props.peer.id}
                rightIcon="ellipsis-vertical"
                onRightPress={() => {
                    // TODO: open chat options
                }}
            />

            {props.mode === "draft" && !isLiveChat && (
                <View
                    style={[
                        styles.draftBanner,
                        {
                            backgroundColor: colors.primarySubtle,
                            borderBottomColor: colors.border,
                        },
                    ]}
                >
                    <Text variant="secondary" color={colors.textSecondary}>
                        Send a message to start a conversation with {" "}
                        <Text variant="secondary" color={colors.primary} style={{ fontWeight: "600" }}>
                            {props.peer.displayName}
                        </Text>
                    </Text>
                </View>
            )}

            <KeyboardAvoidingView
                behavior={Platform.OS === "ios" ? "padding" : undefined}
                style={styles.flex}
                keyboardVerticalOffset={-(insets.bottom - 8)}
            >
                <FlatList
                    style={styles.flex}
                    contentContainerStyle={[
                        styles.messageListContent,
                        { paddingHorizontal: spacing.md },
                    ]}
                    data={listData}
                    keyExtractor={(m) => m.id}
                    inverted
                    keyboardShouldPersistTaps="handled"
                    keyboardDismissMode={Platform.OS === "ios" ? "interactive" : "on-drag"}
                    ListEmptyComponent={
                        <View style={styles.emptyState}>
                            <Text variant="secondary" color={colors.textTertiary}>
                                No messages yet
                            </Text>
                        </View>
                    }
                    renderItem={({ item }) => {
                        const mine = item.sender.id === me?.id;
                        const isPending = item.id === PENDING_OUTGOING_ID;

                        const hasTranslation = Boolean(item.content.translation);
                        const mainText = hasTranslation
                            ? item.content.translation!.translatedText
                            : item.content.text;
                        const originalText = hasTranslation
                            ? item.content.text
                            : null;

                        const receiptStatus = isPending
                            ? undefined
                            : mine && me?.id
                            ? getReceiptStatus(item, me.id)
                            : undefined;

                        return (
                            <>
                                <MessageBubble
                                    sent={mine}
                                    text={mainText}
                                    originalText={mine ? null : originalText}
                                    time={new Date(item.createdAt)}
                                    receiptStatus={receiptStatus}
                                    isFirstInGroup={item.isFirstInGroup}
                                    isLastInGroup={item.isLastInGroup}
                                    isPending={isPending}
                                    showOriginal={!mine && hasTranslation}
                                />
                                {item.showDatePill && (
                                    <DatePill
                                        label={formatChatDatePill(new Date(item.createdAt))}
                                    />
                                )}
                            </>
                        );
                    }}
                />
                <MessageInput
                    value={text}
                    onChangeText={setText}
                    onSend={() => sendMessage().catch(() => {})}
                    isSending={isSending}
                />
            </KeyboardAvoidingView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    flex: {
        flex: 1,
    },
    draftBanner: {
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderBottomWidth: 0.5,
    },
    messageListContent: {
        paddingTop: 10,
    },
    emptyState: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        paddingTop: 40,
    },
});
