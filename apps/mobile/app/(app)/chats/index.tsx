import { Chat } from "@app/shared-types/models";
import { Ionicons } from "@expo/vector-icons";
import { useEffect, useMemo, useState, useCallback, useRef } from "react";
import {
    ActivityIndicator,
    FlatList,
    Pressable,
    StyleSheet,
    View,
} from "react-native";
import { router } from "expo-router";
import { getChats } from "@/src/api/chats";
import { useChatStore } from "@/src/store/chatStore";
import { useUserStore } from "@/src/store/userStore";
import { useTheme } from "@/src/theme";
import { Text } from "@/src/components/ui/Text";
import { ChatListItem } from "@/src/components/chat/ChatListItem";
import { Divider } from "@/src/components/ui/Divider";
import { BottomTabBar } from "@/src/components/navigation/BottomTabBar";
import { SearchOverlay } from "@/src/components/chat/SearchOverlay";
import { SimpleScreenHeader as ScreenHeader } from "@/src/components/ui/SimpleScreenHeader";
import { countUnread } from "@/src/utils/messages";
import { useNavigationGuard } from "@/src/hooks/useNavigationGuard";

function getPeer(chat: Chat, myUserId: string | null) {
    if (!myUserId) return chat.members[0] ?? null;
    return chat.members.find((m) => m.id !== myUserId) ?? chat.members[0] ?? null;
}

export default function ChatsScreen() {
    const { colors, spacing, radii, avatarSizes } = useTheme();

    const guard = useNavigationGuard();

    const chats = useChatStore((s) => s.chats);
    const setChats = useChatStore((s) => s.setChats);
    const messagesByChatId = useChatStore((s) => s.messagesByChatId);

    const me = useUserStore((s) => s.me);

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [searchOpen, setSearchOpen] = useState(false);
    const [searchBarY, setSearchBarY] = useState(0);
    const searchBarRef = useRef<View>(null);

    const unreadByChatId = useMemo(() => {
        const map: Record<string, number> = {};
        if (!me) return map;
        for (const c of chats) {
            map[c.id] = countUnread(messagesByChatId[c.id], me.id);
        }
        return map;
    }, [chats, messagesByChatId, me]);

    const loadChats = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const items = await getChats();
            setChats(items);
        } catch (e: any) {
            setError(e?.message ?? "Failed to load chats");
        } finally {
            setLoading(false);
        }
    }, [setChats]);

    useEffect(() => {
        void loadChats();
    }, [loadChats]);

    function measureSearchBar() {
        searchBarRef.current?.measureInWindow((_x, y) => {
            setSearchBarY(y);
            setSearchOpen(true);
        });
    }

    function handleNavigateToChat(params: {
        chatId: string;
        peerId: string;
        peerUsername: string;
        peerDisplayName: string;
        peerPictureUrl?: string;
        peerPreferredLang: string;
    }) {
        guard(() => router.push({
            pathname: "/chats/[chatId]",
            params: {
                chatId: params.chatId,
                peerId: params.peerId,
                peerUsername: params.peerUsername,
                peerDisplayName: params.peerDisplayName,
                peerPictureUrl: params.peerPictureUrl,
                peerPreferredLang: params.peerPreferredLang,
            },
        }));
    }

    function handleNavigateToNewChat(params: {
        peerId: string;
        peerUsername: string;
        peerDisplayName: string;
        peerPictureUrl?: string;
        peerPreferredLang: string;
    }) {
        guard(() => router.push({
            pathname: "/chats/new",
            params: {
                peerId: params.peerId,
                peerUsername: params.peerUsername,
                peerDisplayName: params.peerDisplayName,
                peerPictureUrl: params.peerPictureUrl,
                peerPreferredLang: params.peerPreferredLang,
            },
        }));
    }

    return (
        <View style={[styles.screen, { backgroundColor: colors.bg }]}>
            <ScreenHeader title="Chats" />

            <Pressable
                ref={searchBarRef}
                onPress={measureSearchBar}
                style={({ pressed }) => [
                    styles.searchBar,
                    {
                        backgroundColor: colors.inputBg,
                        borderColor: colors.border,
                        borderRadius: radii.search,
                        marginHorizontal: spacing.lg,
                        opacity: pressed ? 0.85 : 1,
                    },
                ]}
            >
                <Ionicons name="search" size={16} color={colors.textTertiary} style={{ marginRight: 8 }} />
                <Text variant="body" color={colors.textTertiary}>
                    Search users...
                </Text>
            </Pressable>

            {error && (
                <View style={[styles.errorBanner, { backgroundColor: colors.primarySubtle, borderColor: colors.error }]}>
                    <Ionicons name="alert-circle" size={18} color={colors.error} style={{ marginRight: 8 }} />
                    <Text variant="secondary" color={colors.error} style={{ flex: 1 }}>
                        {error}
                    </Text>
                </View>
            )}

            <FlatList
                style={styles.chatList}
                data={chats}
                keyExtractor={(c) => c.id}
                refreshing={loading}
                onRefresh={() => loadChats()}
                contentContainerStyle={[
                    styles.chatListContent,
                    chats.length === 0 && styles.chatListEmpty,
                    { paddingBottom: spacing.lg },
                ]}
                ItemSeparatorComponent={() => (
                    <Divider indent={spacing.lg + avatarSizes.lg + spacing.md} />
                )}
                ListEmptyComponent={
                    loading ? (
                        <View style={styles.emptyCenter}>
                            <ActivityIndicator size="large" color={colors.primary} />
                            <Text variant="secondary" color={colors.textSecondary} style={{ marginTop: 12 }}>
                                Loading chats…
                            </Text>
                        </View>
                    ) : (
                        <View style={styles.emptyCenter}>
                            <View style={[styles.emptyIcon, { backgroundColor: colors.primarySubtle }]}>
                                <Ionicons name="chatbubbles-outline" size={36} color={colors.primary} />
                            </View>
                            <Text variant="sectionHeader" style={{ marginTop: 16 }}>
                                No chats yet
                            </Text>
                            <Text variant="secondary" color={colors.textSecondary} align="center" style={{ marginTop: 6, maxWidth: 240 }}>
                                Use search above to find people and start talking.
                            </Text>
                        </View>
                    )
                }
                renderItem={({ item }) => {
                    const peer = getPeer(item, me?.id ?? null);
                    const title = peer?.displayName ?? "Chat";
                    const unread = unreadByChatId[item.id] ?? 0;
                    const last = item.lastMessage;
                    const lastOriginalText = last?.content.text ?? "";
                    const lastTranslatedText = last?.content.translation?.translatedText ?? null;
                    const lastPreview =
                        last && me && last.sender.id === me.id
                            ? `You: ${lastOriginalText}`
                            : lastTranslatedText ?? lastOriginalText;
                    const lastTime = last?.createdAt ? new Date(last.createdAt) : null;

                    return (
                        <ChatListItem
                            name={title}
                            userId={peer?.id ?? item.id}
                            imageUrl={peer?.pictureUrl}
                            lastMessage={lastPreview || "No messages yet"}
                            time={lastTime}
                            unreadCount={unread}
                            onPress={() =>
                                guard(() => router.push({
                                    pathname: "/chats/[chatId]",
                                    params: {
                                        chatId: item.id,
                                        peerId: peer?.id ?? item.id,
                                        peerUsername: peer?.username ?? "",
                                        peerDisplayName: peer?.displayName ?? "",
                                        peerPictureUrl: peer?.pictureUrl ?? undefined,
                                        peerPreferredLang: peer?.preferredLang ?? "",
                                    },
                                }))
                            }
                        />
                    );
                }}
            />

            <BottomTabBar
                active="chats"
                userDisplayName={me?.displayName}
                userImageUrl={me?.pictureUrl}
                userId={me?.id}
                onTabPress={(tab) => {
                    if (tab !== "chats") {
                        router.replace(`/(app)/${tab}`);
                    }
                }}
            />

            <SearchOverlay
                visible={searchOpen}
                searchBarY={searchBarY}
                onClose={() => setSearchOpen(false)}
                onNavigateToChat={handleNavigateToChat}
                onNavigateToNewChat={handleNavigateToNewChat}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    screen: {
        flex: 1,
    },
    searchBar: {
        flexDirection: "row",
        alignItems: "center",
        paddingHorizontal: 12,
        paddingVertical: 10,
        marginBottom: 8,
        borderWidth: 0.5,
    },
    errorBanner: {
        flexDirection: "row",
        alignItems: "center",
        marginHorizontal: 16,
        marginBottom: 8,
        padding: 12,
        borderRadius: 10,
        borderWidth: 0.5,
    },
    chatList: {
        flex: 1,
    },
    chatListContent: {
        flexGrow: 1,
    },
    chatListEmpty: {
        justifyContent: "center",
    },
    emptyCenter: {
        alignItems: "center",
        paddingTop: 48,
        paddingHorizontal: 28,
    },
    emptyIcon: {
        width: 72,
        height: 72,
        borderRadius: 36,
        alignItems: "center",
        justifyContent: "center",
    },
});
