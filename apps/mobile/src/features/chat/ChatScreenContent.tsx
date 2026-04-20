import { useEffect, useMemo, useState } from "react";
import {
    FlatList,
    Platform,
    StyleSheet,
    View,
} from "react-native";
import { KeyboardAvoidingView } from "react-native-keyboard-controller";
import { getMessagesForChat, createMessageForChat } from "@/src/api/messages";
import { useChatStore, type PendingOutgoing } from "@/src/store/chatStore";
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
    generateClientId,
    findMatchingPending,
} from "@/src/utils/messages";
import type { Chat, Message, User } from "@app/shared-types/models";
import { LanguageCode } from "@app/shared-types/enums";
import { LanguageDisplayName } from "@/src/constants/languages";
import { DatePill } from "@/src/components/chat/DatePill";
import { formatChatDatePill } from "@/src/utils/dateFormat";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useMarkMessagesAsRead } from "@/src/hooks/useMarkMessagesAsRead";

const EMPTY_MESSAGES: Message[] = [];
const EMPTY_PENDING: PendingOutgoing[] = [];
const PENDING_ID_PREFIX = "__pending__";

function buildPendingMessage(
    pending: PendingOutgoing,
    myUserId: string,
    chatId: string
): Message {
    return {
        id: `${PENDING_ID_PREFIX}${pending.clientId}`,
        chatId,
        sender: {
            id: myUserId,
            username: "",
            displayName: "",
            preferredLang: "",
            createdAt: new Date(pending.sentAt).toISOString(),
        },
        content: { id: "", text: pending.text, originalLang: "" },
        receipts: [],
        isDeleted: false,
        createdAt: new Date(pending.sentAt).toISOString(),
        updatedAt: new Date(pending.sentAt).toISOString(),
    };
}

type Peer = Omit<User, "createdAt">;

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
        clientId: string;
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
    const [isCreatingChat, setIsCreatingChat] = useState(false);

    const isLiveChat = Boolean(activeChatId) && !isCreatingChat;

    const messages = useChatStore((s) =>
        activeChatId && !isCreatingChat
            ? s.messagesByChatId[activeChatId] ?? EMPTY_MESSAGES
            : EMPTY_MESSAGES
    );
    const isLoaded = useChatStore((s) =>
        activeChatId && !isCreatingChat ? s.loadedChatIds[activeChatId] ?? false : false
    );

    // Pending outgoing messages for this chat
    const pendingChatKey = activeChatId ?? "__draft__";
    const pendingOutgoing = useChatStore(
        (s) => s.pendingOutgoingByChatId[pendingChatKey] ?? EMPTY_PENDING
    );

    const appendChat = useChatStore((s) => s.appendChat);
    const setMessagesForChat = useChatStore((s) => s.setMessagesForChat);
    const appendMessage = useChatStore((s) => s.appendMessage);
    const setMessageReceipt = useChatStore((s) => s.setMessageReceipt);
    const addPendingOutgoing = useChatStore((s) => s.addPendingOutgoing);
    const removePendingOutgoing = useChatStore((s) => s.removePendingOutgoing);

    const me = useUserStore((state) => state.me);

    // Load messages for the chat
    useEffect(() => {
        (async () => {
            if (!activeChatId || isCreatingChat || isLoaded) return;
            try {
                const items = await getMessagesForChat({
                    chatId: activeChatId,
                    limit: 999, // TODO: pagination
                });
                setMessagesForChat(activeChatId, items);
            } catch (e) {
                console.error(e);
            }
        })();
    }, [activeChatId, isCreatingChat, isLoaded, setMessagesForChat]);

    // Compare pending outgoing messages with the real messages every time messages changes
    // If a real message has arrived that matches a pending entry, clear the pending entry
    useEffect(() => {
        if (!activeChatId || isCreatingChat || !me) return;
        if (pendingOutgoing.length === 0) return;

        for (const msg of messages) {
            const match = findMatchingPending(msg, pendingOutgoing, me.id);
            if (match) {
                removePendingOutgoing(activeChatId, match.clientId);
            }
        }
    }, [messages, pendingOutgoing, activeChatId, isCreatingChat, me, removePendingOutgoing]);

    useMarkMessagesAsRead({
        chatId: activeChatId && !isCreatingChat ? activeChatId : null,
        myUserId: me?.id ?? null,
        messages,
        onLocalReceipt: (messageId, readAt) => {
            if (!me) return;
            setMessageReceipt(messageId, me.id, { readAt });
        },
    });

    // Build the list data for the chat
    const listData = useMemo(() => {
        const grouped = computeGroupFlags(messages).reverse();
        const withDatePills = computeDatePillFlags(grouped);

        if (pendingOutgoing.length === 0 || !me) {
            return withDatePills;
        }

        const chatIdForPending = activeChatId ?? "draft";
        const pendingRendered = [...pendingOutgoing]
            .sort((a, b) => a.sentAt - b.sentAt)
            .map((p) => ({
                ...buildPendingMessage(p, me.id, chatIdForPending),
                isFirstInGroup: true,
                isLastInGroup: true,
                showDatePill: false,
            }))
            .reverse();

        return [...pendingRendered, ...withDatePills];
    }, [messages, pendingOutgoing, me, activeChatId]);

    async function sendMessage() {
        const trimmed = text.trim();
        if (!trimmed) return;
        if (!me) return;

        const clientId = generateClientId();
        const pending: PendingOutgoing = {
            clientId,
            text: trimmed,
            sentAt: Date.now(),
        };

        setText("");

        try {
            if (isLiveChat && activeChatId) {
                addPendingOutgoing(activeChatId, pending);
                try {
                    const message = await createMessageForChat({
                        chatId: activeChatId,
                        content: { text: trimmed },
                        clientId,
                    });
                    appendMessage(activeChatId, message);
                    removePendingOutgoing(activeChatId, clientId);
                } catch (e) {
                    console.error(e);
                    removePendingOutgoing(activeChatId, clientId);
                    setText(trimmed);
                }
                return;
            }

            if (props.mode === "draft") {
                addPendingOutgoing("__draft__", pending);
                setIsCreatingChat(true);
                try {
                    const { chat, message } = await props.onSendFirstMessage({
                        userId: props.peer.id,
                        text: trimmed,
                        clientId,
                    });

                    removePendingOutgoing("__draft__", clientId);
                    appendChat(chat.id, chat);
                    appendMessage(chat.id, message);

                    setActiveChatId(chat.id);
                    setIsCreatingChat(false);
                } catch (e) {
                    console.error(e);
                    removePendingOutgoing("__draft__", clientId);
                    setIsCreatingChat(false);
                    setText(trimmed);
                }
                return;
            }
        } catch (e) {
            console.error(e);
            setText(trimmed);
        }
    }

    if (!me) return null;

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
                            {isLoaded ? (
                                <Text variant="secondary" color={colors.textTertiary}>
                                    No messages yet
                                </Text>
                            ) : (
                                <Text variant="secondary" color={colors.textTertiary}>
                                    Loading messages…
                                </Text>
                            )}
                        </View>
                    }
                    renderItem={({ item }) => {
                        const mine = item.sender.id === me?.id;
                        const isPending = item.id.startsWith(PENDING_ID_PREFIX);

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
                    canSend={!isCreatingChat}
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