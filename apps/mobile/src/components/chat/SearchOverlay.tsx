import React, { useEffect, useRef, useState, useMemo } from "react";
import {
    ActivityIndicator,
    FlatList,
    Keyboard,
    Pressable,
    StyleSheet,
    TextInput,
    View,
} from "react-native";
import Animated, {
    useSharedValue,
    useAnimatedStyle,
    withTiming,
    interpolate,
    Easing,
    runOnJS,
} from "react-native-reanimated";
import { Ionicons, Feather } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme, useInputTheme } from "../../theme";
import { Text } from "../ui/Text";
import { ChatListItem } from "./ChatListItem";
import { SearchUserItem } from "./SearchUserItem";
import { Divider } from "../ui/Divider";
import { searchUsers } from "@/src/api/users";
import { useChatStore } from "@/src/store/chatStore";
import { useUserStore } from "@/src/store/userStore";
import { countUnread } from "@/src/utils/messages";
import type { SearchUsersResult } from "@app/shared-types/models";

const SEARCH_DEBOUNCE_MS = 380;
const ANIM_DURATION = 280;
const BACK_BUTTON_SLOT_WIDTH = 30;
const BACK_BUTTON_SLOT_GAP = 8;

interface SearchOverlayProps {
    visible: boolean;
    onClose: () => void;
    searchBarY: number;
    onNavigateToChat: (params: {
        chatId: string;
        peerId: string;
        peerUsername: string;
        peerDisplayName: string;
        peerPictureUrl?: string;
        peerPreferredLang: string;
    }) => void;
    onNavigateToNewChat: (params: {
        peerId: string;
        peerUsername: string;
        peerDisplayName: string;
        peerPictureUrl?: string;
        peerPreferredLang: string;
    }) => void;
}

export function SearchOverlay({
    visible,
    onClose,
    searchBarY,
    onNavigateToChat,
    onNavigateToNewChat,
}: SearchOverlayProps) {
    const { colors, spacing, radii, avatarSizes } = useTheme();
    const inputTheme = useInputTheme();
    const insets = useSafeAreaInsets();

    const me = useUserStore((s) => s.me);
    const chats = useChatStore((s) => s.chats);
    const messagesByChatId = useChatStore((s) => s.messagesByChatId);

    const [searchQuery, setSearchQuery] = useState("");
    const [searchResults, setSearchResults] = useState<SearchUsersResult[]>([]);
    const [searchLoading, setSearchLoading] = useState(false);
    const [searchError, setSearchError] = useState<string | null>(null);
    const searchInputRef = useRef<TextInput>(null);

    const progress = useSharedValue(0);
    const [isRendered, setIsRendered] = useState(false);

    // Target Y for the search bar in overlay mode
    const overlaySearchY = insets.top + 8;
    // How far the search bar needs to slide up
    const slideDistance = searchBarY - overlaySearchY;

    useEffect(() => {
        if (visible) {
            setIsRendered(true);
            progress.value = withTiming(1, {
                duration: ANIM_DURATION,
                easing: Easing.out(Easing.cubic),
            });
            setTimeout(() => searchInputRef.current?.focus(), 120);
        } else {
            Keyboard.dismiss();
            progress.value = withTiming(0, {
                duration: ANIM_DURATION,
                easing: Easing.in(Easing.cubic),
            }, (finished) => {
                if (finished) {
                    runOnJS(setIsRendered)(false);
                    runOnJS(resetState)();
                }
            });
        }
    }, [visible]);

    function resetState() {
        setSearchQuery("");
        setSearchResults([]);
        setSearchError(null);
        setSearchLoading(false);
    }

    const bgStyle = useAnimatedStyle(() => ({
        opacity: progress.value,
    }));

    // Search bar slides up from its original position
    const searchBarStyle = useAnimatedStyle(() => ({
        transform: [
            { translateY: interpolate(progress.value, [0, 1], [slideDistance, 0]) },
        ],
    }));

    // Back button fades in
    const backButtonStyle = useAnimatedStyle(() => ({
        opacity: interpolate(progress.value, [0.3, 1], [0, 1]),
        transform: [
            { translateX: interpolate(progress.value, [0, 1], [-12, 0]) },
        ],
    }));

    // Back button slot fades in
    const backButtonSlotStyle = useAnimatedStyle(() => ({
        width: interpolate(progress.value, [0, 1], [0, BACK_BUTTON_SLOT_WIDTH]),
        marginRight: interpolate(progress.value, [0, 1], [0, BACK_BUTTON_SLOT_GAP]),
    }));

    // Results content fades in slightly after
    const contentStyle = useAnimatedStyle(() => ({
        opacity: interpolate(progress.value, [0.4, 1], [0, 1]),
    }));

    // Search API call
    useEffect(() => {
        if (!visible) return;

        const q = searchQuery.trim();
        if (!q) {
            setSearchResults([]);
            setSearchError(null);
            setSearchLoading(false);
            return;
        }

        let cancelled = false;
        const handle = setTimeout(() => {
            (async () => {
                setSearchLoading(true);
                setSearchError(null);
                try {
                    const res = await searchUsers({ query: q, limit: 20 });
                    if (!cancelled) setSearchResults(res.users);
                } catch (e: any) {
                    if (!cancelled) {
                        setSearchError(e?.message ?? "Search failed");
                        setSearchResults([]);
                    }
                } finally {
                    if (!cancelled) setSearchLoading(false);
                }
            })();
        }, SEARCH_DEBOUNCE_MS);

        return () => {
            cancelled = true;
            clearTimeout(handle);
        };
    }, [searchQuery, visible]);

    // Split results: with chat first, then without
    const { withChat, withoutChat } = useMemo(() => {
        const w: SearchUsersResult[] = [];
        const wo: SearchUsersResult[] = [];

        const chatByPeerId = new Map<string, typeof chats[number]>();
        if (me) {
            for (const c of chats) {
                const peer = c.members.find((m) => m.id !== me.id) ?? c.members[0];
                if (peer) chatByPeerId.set(peer.id, c);
            }
        }

        for (const r of searchResults) {
            const liveChat = chatByPeerId.get(r.user.id);
            if (liveChat) {
                w.push({ ...r, chat: liveChat });
            }
            else if (r.chat) {
                w.push({ ...r, chat: r.chat });
            } else {
                wo.push(r);
            }
        }
        return { withChat: w, withoutChat: wo };
    }, [searchResults, chats, me]);

    if (!isRendered) return null;

    const hasQuery = searchQuery.trim().length > 0;
    const hasAnyResults = withChat.length > 0 || withoutChat.length > 0;

    return (
        <View style={styles.overlay} pointerEvents={visible ? "auto" : "none"}>
            <Animated.View
                style={[
                    styles.bg,
                    { backgroundColor: colors.bg },
                    bgStyle,
                ]}
            />

            <Animated.View
                style={[
                    styles.searchHeader,
                    { top: overlaySearchY },
                    searchBarStyle,
                ]}
            >
                <View style={styles.searchRow}>
                    <Animated.View style={[styles.backButtonSlot, backButtonSlotStyle]}>
                        <Animated.View style={backButtonStyle}>
                        <Pressable
                            onPress={onClose}
                            hitSlop={12}
                            style={({ pressed }) => ({
                                opacity: pressed ? 0.6 : 1,
                                padding: 4,
                            })}
                        >
                            <Ionicons name="arrow-back" size={22} color={colors.textPrimary} />
                        </Pressable>
                        </Animated.View>
                    </Animated.View>

                    <View
                        style={[
                            styles.inputRow,
                            {
                                backgroundColor: colors.inputBg,
                                borderColor: colors.border,
                                borderRadius: radii.search,
                            },
                        ]}
                    >
                        <Ionicons
                            name="search"
                            size={16}
                            color={searchQuery ? colors.primary : colors.textTertiary}
                        />
                        <TextInput
                            ref={searchInputRef}
                            value={searchQuery}
                            onChangeText={setSearchQuery}
                            placeholder="Search users..."
                            {...inputTheme}
                            style={[styles.textInput, { color: colors.textPrimary }]}
                            autoCapitalize="none"
                            autoCorrect={false}
                            returnKeyType="search"
                        />
                        {searchQuery.length > 0 && (
                            <Pressable onPress={() => setSearchQuery("")} hitSlop={8}>
                                <Ionicons name="close-circle" size={18} color={colors.textTertiary} />
                            </Pressable>
                        )}
                    </View>
                </View>
            </Animated.View>

            <Animated.View
                style={[
                    styles.content,
                    { top: overlaySearchY + 56 },
                    contentStyle,
                ]}
            >
                {searchLoading && hasQuery && (
                    <View style={[styles.statusRow, { borderBottomColor: colors.border }]}>
                        <ActivityIndicator size="small" color={colors.primary} />
                        <Text variant="secondary" color={colors.textSecondary} style={{ marginLeft: 10 }}>
                            Searching…
                        </Text>
                    </View>
                )}

                {searchError && !searchLoading && (
                    <View style={[styles.statusRow, { borderBottomColor: colors.border }]}>
                        <Ionicons name="cloud-offline-outline" size={18} color={colors.error} />
                        <Text variant="secondary" color={colors.error} style={{ marginLeft: 10, flex: 1 }}>
                            {searchError}
                        </Text>
                    </View>
                )}

                <FlatList
                    data={[]}
                    renderItem={null}
                    keyboardShouldPersistTaps="handled"
                    keyboardDismissMode="on-drag"
                    contentContainerStyle={{ paddingBottom: 20 + insets.bottom }}
                    ListHeaderComponent={
                        <>
                            {/* YOUR CHATS section */}
                            {hasQuery && withChat.length > 0 && (
                                <>
                                    <View style={styles.sectionHeader}>
                                        <Text variant="caption" color={colors.textTertiary} style={styles.sectionLabel}>
                                            YOUR CHATS
                                        </Text>
                                    </View>
                                    {withChat.map((result, i) => {
                                        const chat = result.chat!;
                                        const peer = result.user;
                                        const last = chat.lastMessage;
                                        const lastOriginalText = last?.content.text ?? "";
                                        const lastTranslatedText = last?.content.translation?.translatedText ?? null;
                                        const lastPreview =
                                            last && me && last.sender.id === me.id
                                                ? `You: ${lastOriginalText}`
                                                : lastTranslatedText ?? lastOriginalText;
                                        const lastTime = last?.createdAt ? new Date(last.createdAt) : null;
                                        const unread = me ? countUnread(messagesByChatId[chat.id], me.id) : 0;

                                        return (
                                            <React.Fragment key={result.user.id}>
                                                {i > 0 && <Divider indent={spacing.lg + avatarSizes.lg + spacing.md} />}
                                                <ChatListItem
                                                    name={peer.displayName}
                                                    userId={peer.id}
                                                    imageUrl={peer.pictureUrl}
                                                    lastMessage={lastPreview || "No messages yet"}
                                                    time={lastTime}
                                                    unreadCount={unread}
                                                    onPress={() =>
                                                        onNavigateToChat({
                                                            chatId: chat.id,
                                                            peerId: peer.id,
                                                            peerUsername: peer.username,
                                                            peerDisplayName: peer.displayName,
                                                            peerPictureUrl: peer.pictureUrl ?? undefined,
                                                            peerPreferredLang: peer.preferredLang,
                                                        })
                                                    }
                                                />
                                            </React.Fragment>
                                        );
                                    })}
                                </>
                            )}

                            {/* GLOBAL SEARCH section */}
                            {hasQuery && withoutChat.length > 0 && (
                                <>
                                    <View style={[
                                        styles.sectionHeader,
                                    ]}>
                                        <Text variant="caption" color={colors.textTertiary} style={styles.sectionLabel}>
                                            GLOBAL SEARCH
                                        </Text>
                                    </View>
                                    {withoutChat.map((result, i) => (
                                        <React.Fragment key={result.user.id}>
                                            {i > 0 && <Divider indent={spacing.lg + avatarSizes.md + spacing.md} />}
                                            <SearchUserItem
                                                name={result.user.displayName}
                                                username={result.user.username}
                                                userId={result.user.id}
                                                imageUrl={result.user.pictureUrl}
                                                preferredLang={result.user.preferredLang}
                                                onPress={() =>
                                                    onNavigateToNewChat({
                                                        peerId: result.user.id,
                                                        peerUsername: result.user.username,
                                                        peerDisplayName: result.user.displayName,
                                                        peerPictureUrl: result.user.pictureUrl ?? undefined,
                                                        peerPreferredLang: result.user.preferredLang,
                                                    })
                                                }
                                            />
                                        </React.Fragment>
                                    ))}
                                </>
                            )}

                            {/* Empty: no results */}
                            {hasQuery && !searchLoading && !hasAnyResults && (
                                <View style={styles.emptyCenter}>
                                    <View style={[styles.emptyIcon, { backgroundColor: colors.primarySubtle }]}>
                                        <Feather name="user" size={28} color={colors.primary} />
                                    </View>
                                    <Text variant="sectionHeader" style={{ marginTop: 16 }}>
                                        No users found
                                    </Text>
                                    <Text variant="secondary" color={colors.textSecondary} style={{ marginTop: 4 }}>
                                        Try another name or username
                                    </Text>
                                </View>
                            )}

                            {/* Empty: no query yet */}
                            {!hasQuery && (
                                <View style={styles.emptyCenter}>
                                    <View style={[styles.emptyIcon, { backgroundColor: colors.primarySubtle }]}>
                                        <Ionicons name="search" size={24} color={colors.primary} />
                                    </View>
                                    <Text variant="sectionHeader" style={{ marginTop: 16 }}>
                                        Find peopled
                                    </Text>
                                    <Text
                                        variant="secondary"
                                        color={colors.textSecondary}
                                        align="center"
                                        style={{ marginTop: 4, maxWidth: 260 }}
                                    >
                                        Search for users to start a conversation
                                    </Text>
                                </View>
                            )}
                        </>
                    }
                />
            </Animated.View>
        </View>
    );
}

const styles = StyleSheet.create({
    overlay: {
        ...StyleSheet.absoluteFillObject,
        zIndex: 10,
    },
    bg: {
        ...StyleSheet.absoluteFillObject,
    },
    searchHeader: {
        position: "absolute",
        left: 0,
        right: 0,
        paddingHorizontal: 16,
        zIndex: 11,
    },
    searchRow: {
        flexDirection: "row",
        alignItems: "center",
    },
    backButtonSlot: {
        overflow: "hidden",
        alignItems: "flex-start",
    },
    inputRow: {
        flex: 1,
        flexDirection: "row",
        alignItems: "center",
        paddingHorizontal: 12,
        height: 40,
        borderWidth: 0.5,
    },
    textInput: {
        flex: 1,
        marginLeft: 8,
        fontSize: 15,
        paddingVertical: 0,
    },
    content: {
        position: "absolute",
        left: 0,
        right: 0,
        bottom: 0,
    },
    statusRow: {
        flexDirection: "row",
        alignItems: "center",
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderBottomWidth: 0.5,
    },
    sectionHeader: {
        flexDirection: "row",
        alignItems: "center",
        paddingHorizontal: 16,
        paddingTop: 12,
        paddingBottom: 8,
    },
    sectionLabel: {
        flex: 1,
        letterSpacing: 0.6,
        fontWeight: "700",
    },
    emptyCenter: {
        alignItems: "center",
        paddingTop: 48,
        paddingHorizontal: 28,
    },
    emptyIcon: {
        width: 64,
        height: 64,
        borderRadius: 32,
        alignItems: "center",
        justifyContent: "center",
    },
});
