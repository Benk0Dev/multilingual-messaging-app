import { Chat, type Message, type SearchUsersResult } from "@app/shared-types/models";
import { Ionicons } from "@expo/vector-icons";
import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router } from "expo-router";
import { getChats } from "@/src/api/chats";
import { getMe, searchUsers } from "@/src/api/users";
import { logout } from "../../../src/auth/authService";
import { useChatStore } from "@/src/store/chatStore";

const SEARCH_DEBOUNCE_MS = 380;

function getPeer(chat: Chat, myUserId: string | null) {
  if (!myUserId) return chat.members[0] ?? null;
  return chat.members.find((m) => m.id !== myUserId) ?? chat.members[0] ?? null;
}

function countUnreadForChat(messages: Message[] | undefined, myUserId: string): number {
  if (!messages?.length) return 0;
  let n = 0;
  for (const m of messages) {
    if (m.isDeleted || m.sender.id === myUserId) continue;
    const mine = m.receipts?.find((r) => r.userId === myUserId);
    if (!mine || !mine.readAt) n += 1;
  }
  return n;
}

function PeerAvatar({ displayName }: { displayName: string }) {
  const initial = displayName.trim().slice(0, 1).toUpperCase() || "?";
  return (
    <View style={styles.avatar}>
      <Text style={styles.avatarLetter}>{initial}</Text>
    </View>
  );
}

export default function ChatsScreen() {
  const insets = useSafeAreaInsets();
  const chats = useChatStore((state) => state.chats);
  const setChats = useChatStore((state) => state.setChats);
  const messagesByChatId = useChatStore((state) => state.messagesByChatId);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [myUserId, setMyUserId] = useState<string | null>(null);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SearchUsersResult[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const searchInputRef = useRef<TextInput>(null);

  const unreadByChatId = useMemo(() => {
    const map: Record<string, number> = {};
    if (!myUserId) return map;
    for (const c of chats) {
      map[c.id] = countUnreadForChat(messagesByChatId[c.id], myUserId);
    }
    return map;
  }, [chats, messagesByChatId, myUserId]);

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

  async function loadMe() {
    try {
      const res = await getMe();
      setMyUserId(res.user.id);
    } catch (e: any) {
      setError(e?.message ?? "Failed to load me");
    } finally {
      setLoading(false);
    }
  }

  async function onLogout() {
    await logout();
    router.replace("/(auth)/test/dev-auth-test");
  }

  useEffect(() => {
    void loadChats();
  }, [loadChats]);

  useEffect(() => {
    (async () => {
      await loadMe();
    })();
  }, []);

  useEffect(() => {
    if (!searchOpen) return;

    const id = requestAnimationFrame(() => {
      searchInputRef.current?.focus();
    });
    return () => cancelAnimationFrame(id);
  }, [searchOpen]);

  useEffect(() => {
    if (!searchOpen) return;

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
          const res = await searchUsers(q);
          if (!cancelled) {
            setSearchResults(res.users);
          }
        } catch (e: any) {
          if (!cancelled) {
            setSearchError(e?.message ?? "Search failed");
            setSearchResults([]);
          }
        } finally {
          if (!cancelled) {
            setSearchLoading(false);
          }
        }
      })();
    }, SEARCH_DEBOUNCE_MS);

    return () => {
      cancelled = true;
      clearTimeout(handle);
    };
  }, [searchQuery, searchOpen]);

  function closeSearch() {
    setSearchOpen(false);
    setSearchQuery("");
    setSearchResults([]);
    setSearchError(null);
    setSearchLoading(false);
  }

  function openSearch() {
    setSearchOpen(true);
  }

  return (
    <View style={styles.screen}>
      {error ? (
        <View style={styles.errorBanner}>
          <Ionicons name="alert-circle" size={20} color="#B42318" style={styles.errorBannerIcon} />
          <Text style={styles.errorBannerText}>{error}</Text>
        </View>
      ) : null}

      <Pressable
        onPress={openSearch}
        style={({ pressed }) => [styles.searchBarTrigger, pressed && styles.searchBarTriggerPressed]}
        accessibilityRole="button"
        accessibilityLabel="Search users"
      >
        <Ionicons name="search" size={20} color="#667085" style={styles.searchIcon} />
        <Text style={styles.searchBarPlaceholder}>Search people</Text>
      </Pressable>

      <FlatList
        style={styles.chatList}
        data={chats}
        keyExtractor={(c) => c.id}
        refreshing={loading}
        onRefresh={() => loadChats()}
        contentContainerStyle={[
          styles.chatListContent,
          chats.length === 0 ? styles.chatListContentEmpty : null,
          { paddingBottom: 16 },
        ]}
        ListEmptyComponent={
          loading ? (
            <View style={styles.listEmptyLoading}>
              <ActivityIndicator size="large" color="#2F80ED" />
              <Text style={styles.listEmptyLoadingLabel}>Loading chats…</Text>
            </View>
          ) : (
            <View style={styles.emptyState}>
              <View style={styles.emptyIconWrap}>
                <Ionicons name="chatbubbles-outline" size={40} color="#2F80ED" />
              </View>
              <Text style={styles.emptyTitle}>No chats yet</Text>
              <Text style={styles.emptySubtitle}>Use search above to find people and start talking.</Text>
            </View>
          )
        }
        renderItem={({ item }) => {
          const peer = getPeer(item, myUserId);
          const title = peer?.displayName ?? "Chat";
          const unread = unreadByChatId[item.id] ?? 0;
          const last = item.lastMessage;
          const lastOriginalText = last?.content.text ?? "";
          const lastTranslatedText = last?.content.translation?.translatedText ?? null;
          const lastPreview =
            last && myUserId && last.sender.id === myUserId
              ? `You: ${lastOriginalText}`
              : lastTranslatedText ?? lastOriginalText;
          const lastTime =
            last?.createdAt
              ? new Date(last.createdAt).toLocaleString("en-GB", { timeStyle: "short" })
              : null;

          return (
            <Pressable
              onPress={() => router.push({ pathname: "/chats/[chatId]", params: { 
                chatId: item.id,
                title,
               }})}
              style={({ pressed }) => [styles.chatRow, pressed && styles.chatRowPressed]}
            >
              <PeerAvatar displayName={title} />
              <View style={styles.chatRowText}>
                <Text style={[styles.chatTitle, unread > 0 && styles.chatTitleUnread]} numberOfLines={1}>
                  {title}
                </Text>

                {last ? (
                  <View style={styles.chatLastRow}>
                    <Text
                      style={[styles.chatPreview, unread > 0 && styles.chatPreviewUnread]}
                      numberOfLines={1}
                    >
                      {lastPreview}
                    </Text>
                    {lastTime ? <Text style={styles.chatTime}>{lastTime}</Text> : null}
                  </View>
                ) : null}
              </View>
              {unread > 0 ? (
                <View style={styles.unreadBadge} accessibilityLabel={`${unread} unread`}>
                  <Text style={styles.unreadBadgeText}>{unread > 99 ? "99+" : unread}</Text>
                </View>
              ) : null}
            </Pressable>
          );
        }}
      />

      <View
        style={[
          styles.screenFooter,
          {
            paddingBottom: Math.max(insets.bottom, 16),
          },
        ]}
      >
        <Pressable
          onPress={onLogout}
          style={({ pressed }) => [styles.logoutButton, pressed && styles.logoutPressed]}
        >
          <Ionicons name="log-out-outline" size={20} color="#667085" style={styles.logoutIcon} />
          <Text style={styles.logoutLabel}>Log out</Text>
        </Pressable>
      </View>

      <Modal
        visible={searchOpen}
        animationType="slide"
        presentationStyle="fullScreen"
        onRequestClose={closeSearch}
      >
        <KeyboardAvoidingView
          style={styles.overlayKeyboardWrap}
          behavior={Platform.OS === "ios" ? "padding" : undefined}
        >
          <View style={[styles.overlayRoot, { paddingTop: insets.top }]}>
            <View style={styles.overlayHeader}>
              <View style={styles.overlayHeaderTop}>
                <Pressable
                  onPress={closeSearch}
                  hitSlop={12}
                  style={({ pressed }) => [styles.closeButton, pressed && styles.closeButtonPressed]}
                  accessibilityRole="button"
                  accessibilityLabel="Close search"
                >
                  <Ionicons name="close" size={24} color="#121926" />
                </Pressable>
                <Text style={styles.overlayTitle}>Search</Text>
                <View style={styles.overlayHeaderSpacer} />
              </View>

              <View style={styles.overlaySearchPill}>
                <Ionicons name="search" size={20} color="#667085" />
                <TextInput
                  ref={searchInputRef}
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                  placeholder="Name or @username"
                  placeholderTextColor="#98A2B3"
                  style={styles.overlaySearchInput}
                  autoCapitalize="none"
                  autoCorrect={false}
                  returnKeyType="search"
                  clearButtonMode="never"
                />
                {searchQuery.length > 0 ? (
                  <Pressable
                    onPress={() => setSearchQuery("")}
                    hitSlop={8}
                    style={({ pressed }) => [styles.overlayClearQuery, pressed && styles.overlayClearQueryPressed]}
                    accessibilityRole="button"
                    accessibilityLabel="Clear search"
                  >
                    <Ionicons name="close-circle" size={22} color="#98A2B3" />
                  </Pressable>
                ) : null}
              </View>
            </View>

            {searchLoading ? (
              <View style={styles.searchStatusCard}>
                <ActivityIndicator size="small" color="#2F80ED" />
                <Text style={styles.searchStatusText}>Searching…</Text>
              </View>
            ) : null}

            {searchError && !searchLoading ? (
              <View style={styles.searchErrorCard}>
                <Ionicons name="cloud-offline-outline" size={22} color="#B42318" style={styles.searchErrorIcon} />
                <Text style={styles.searchErrorText}>{searchError}</Text>
              </View>
            ) : null}

            <FlatList
              data={searchResults}
              keyExtractor={(u) => u.id}
              keyboardShouldPersistTaps="handled"
              keyboardDismissMode="on-drag"
              showsVerticalScrollIndicator={false}
              contentContainerStyle={[
                styles.searchListContent,
                { paddingBottom: 20 + insets.bottom },
                searchResults.length === 0 ? styles.searchListContentEmpty : null,
              ]}
              ListHeaderComponent={
                searchResults.length > 0 ? (
                  <View style={styles.searchResultsHeader}>
                    <Text style={styles.searchResultsHeaderLabel}>People</Text>
                    <View style={styles.searchResultsCount}>
                      <Text style={styles.searchResultsCountText}>{searchResults.length}</Text>
                    </View>
                  </View>
                ) : null
              }
              ListEmptyComponent={
                !searchLoading && searchQuery.trim().length > 0 ? (
                  <View style={styles.searchEmptyState}>
                    <View style={styles.searchEmptyIconWrap}>
                      <Ionicons name="person-outline" size={36} color="#2F80ED" />
                    </View>
                    <Text style={styles.searchEmptyTitle}>No users found</Text>
                    <Text style={styles.searchEmptySubtitle}>Try another name or username.</Text>
                  </View>
                ) : !searchLoading && searchQuery.trim().length === 0 ? (
                  <View style={styles.searchHintState}>
                    <View style={styles.searchHintIconWrap}>
                      <Ionicons name="search" size={32} color="#2F80ED" />
                    </View>
                    <Text style={styles.searchHintTitle}>Find people</Text>
                    <Text style={styles.searchHintSubtitle}>
                      Start typing a display name or username to search.
                    </Text>
                  </View>
                ) : null
              }
              renderItem={({ item }) => (
                <Pressable
                  style={({ pressed }) => [styles.resultRow, pressed && styles.resultRowPressed]}
                  onPress={() => {
                    if (item.chatId) {
                      router.push({ pathname: "/chats/[chatId]", params: { 
                        chatId: item.chatId,
                        title: item.displayName,
                       }});
                      closeSearch();
                    } else {
                      router.push({ pathname: "/chats/new", params: {
                        userId: item.id,
                        username: item.username,
                        displayName: item.displayName,
                        pictureUrl: item.pictureUrl ?? undefined,
                      } as any });
                      closeSearch();
                    }
                  }}
                >
                  <PeerAvatar displayName={item.displayName} />
                  <View style={styles.resultTextBlock}>
                    <Text style={styles.resultDisplayName} numberOfLines={1}>
                      {item.displayName}
                    </Text>
                    <Text style={styles.resultUsername} numberOfLines={1}>
                      @{item.username}
                    </Text>
                  </View>
                  <View style={styles.resultRowTrailing}>
                    {item.chatId ? (
                      <View style={styles.existingChatBadge} accessibilityLabel="Existing chat">
                        <Ionicons name="chatbubble-outline" size={13} color="#15803D" />
                        <Text style={styles.existingChatBadgeText}>Chat</Text>
                      </View>
                    ) : null}
                    <Ionicons name="chevron-forward" size={18} color="#C9D0DB" style={styles.resultChevron} />
                  </View>
                </Pressable>
              )}
            />
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#F4F6F9",
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#2F80ED",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 14,
  },
  avatarLetter: {
    fontSize: 18,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  searchBarTrigger: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: 16,
    marginTop: 10,
    marginBottom: 8,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 14,
    backgroundColor: "#FFFFFF",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "#E5E9F0",
    shadowColor: "#000",
    shadowOpacity: 0.04,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 1 },
    elevation: 1,
  },
  searchBarTriggerPressed: {
    opacity: 0.85,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchBarPlaceholder: {
    fontSize: 16,
    color: "#667085",
  },
  chatList: {
    flex: 1,
  },
  chatListContent: {
    paddingTop: 4,
  },
  screenFooter: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "#E8ECF2",
    backgroundColor: "#F4F6F9",
    paddingTop: 12,
  },
  chatListContentEmpty: {
    flexGrow: 1,
  },
  listEmptyLoading: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 48,
    minHeight: 220,
  },
  listEmptyLoadingLabel: {
    marginTop: 12,
    fontSize: 15,
    color: "#667085",
  },
  emptyState: {
    alignItems: "center",
    paddingHorizontal: 32,
    paddingVertical: 48,
  },
  emptyIconWrap: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "#E8F1FE",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 20,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#121926",
    marginBottom: 8,
    textAlign: "center",
  },
  emptySubtitle: {
    fontSize: 15,
    color: "#667085",
    textAlign: "center",
    lineHeight: 22,
  },
  chatRow: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: 12,
    marginBottom: 8,
    paddingVertical: 12,
    paddingHorizontal: 14,
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "#E8ECF2",
    shadowColor: "#000",
    shadowOpacity: 0.04,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 1 },
    elevation: 1,
  },
  chatRowPressed: {
    opacity: 0.92,
    backgroundColor: "#F7F9FC",
  },
  chatRowText: {
    flex: 1,
    minWidth: 0,
  },
  chatTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#121926",
  },
  chatTitleUnread: {
    fontWeight: "800",
    color: "#0C111D",
  },
  chatLastRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 6,
    gap: 10,
  },
  chatPreview: {
    flex: 1,
    minWidth: 0,
    fontSize: 13,
    color: "#667085",
  },
  chatPreviewUnread: {
    color: "#344054",
    fontWeight: "600",
  },
  unreadBadge: {
    minWidth: 24,
    height: 24,
    paddingHorizontal: 7,
    marginLeft: 10,
    borderRadius: 12,
    backgroundColor: "#2F80ED",
    alignItems: "center",
    justifyContent: "center",
  },
  unreadBadgeText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "800",
    fontVariant: ["tabular-nums"],
  },
  chatTime: {
    fontSize: 12,
    color: "#98A2B3",
  },
  errorBanner: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginHorizontal: 16,
    marginTop: 10,
    marginBottom: 4,
    padding: 12,
    borderRadius: 12,
    backgroundColor: "#FEE4E2",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "#FECDCA",
  },
  errorBannerIcon: {
    marginRight: 8,
    marginTop: 1,
  },
  errorBannerText: {
    flex: 1,
    fontSize: 14,
    color: "#B42318",
    lineHeight: 20,
  },
  logoutButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginHorizontal: 16,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 14,
    backgroundColor: "#FFFFFF",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "#D8DEE8",
  },
  logoutPressed: {
    backgroundColor: "#F2F4F7",
  },
  logoutIcon: {
    marginRight: 8,
  },
  logoutLabel: {
    fontSize: 16,
    fontWeight: "600",
    color: "#475467",
  },
  overlayKeyboardWrap: {
    flex: 1,
    backgroundColor: "#F4F6F9",
  },
  overlayRoot: {
    flex: 1,
    backgroundColor: "#F4F6F9",
  },
  overlayHeader: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 16,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#E8ECF2",
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  overlayHeaderTop: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 14,
  },
  overlayTitle: {
    flex: 1,
    fontSize: 17,
    fontWeight: "700",
    color: "#121926",
    textAlign: "center",
  },
  overlayHeaderSpacer: {
    width: 40,
  },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F2F4F7",
  },
  closeButtonPressed: {
    backgroundColor: "#E8ECF2",
  },
  overlaySearchPill: {
    flexDirection: "row",
    alignItems: "center",
    minHeight: 48,
    paddingHorizontal: 14,
    borderRadius: 14,
    backgroundColor: "#F2F4F7",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "#E5E9F0",
  },
  overlaySearchInput: {
    flex: 1,
    marginLeft: 10,
    fontSize: 16,
    paddingVertical: 12,
    paddingHorizontal: 0,
    color: "#121926",
  },
  overlayClearQuery: {
    marginLeft: 6,
    padding: 2,
  },
  overlayClearQueryPressed: {
    opacity: 0.7,
  },
  searchStatusCard: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "center",
    marginTop: 12,
    marginHorizontal: 16,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: "#FFFFFF",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "#E8ECF2",
  },
  searchStatusText: {
    fontSize: 14,
    color: "#667085",
    marginLeft: 10,
    fontWeight: "500",
  },
  searchErrorCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginHorizontal: 16,
    marginTop: 12,
    padding: 14,
    borderRadius: 12,
    backgroundColor: "#FEE4E2",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "#FECDCA",
  },
  searchErrorIcon: {
    marginRight: 10,
    marginTop: 1,
  },
  searchErrorText: {
    flex: 1,
    fontSize: 14,
    color: "#B42318",
    lineHeight: 20,
    fontWeight: "500",
  },
  searchListContent: {
    paddingTop: 12,
    paddingHorizontal: 4,
  },
  searchListContentEmpty: {
    flexGrow: 1,
  },
  searchResultsHeader: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingBottom: 10,
    marginTop: 4,
  },
  searchResultsHeaderLabel: {
    flex: 1,
    fontSize: 13,
    fontWeight: "700",
    color: "#667085",
    letterSpacing: 0.6,
    textTransform: "uppercase",
  },
  searchResultsCount: {
    minWidth: 26,
    height: 22,
    paddingHorizontal: 8,
    borderRadius: 11,
    backgroundColor: "#E8F1FE",
    alignItems: "center",
    justifyContent: "center",
  },
  searchResultsCountText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#2F80ED",
  },
  searchEmptyState: {
    alignItems: "center",
    paddingHorizontal: 28,
    paddingTop: 48,
    paddingBottom: 32,
  },
  searchEmptyIconWrap: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: "#E8F1FE",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 18,
  },
  searchEmptyTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#121926",
    marginBottom: 8,
    textAlign: "center",
  },
  searchEmptySubtitle: {
    fontSize: 15,
    color: "#667085",
    textAlign: "center",
    lineHeight: 22,
  },
  searchHintState: {
    alignItems: "center",
    paddingHorizontal: 28,
    paddingTop: 40,
    paddingBottom: 32,
  },
  searchHintIconWrap: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "#E8F1FE",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 20,
  },
  searchHintTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#121926",
    marginBottom: 8,
  },
  searchHintSubtitle: {
    fontSize: 15,
    color: "#667085",
    textAlign: "center",
    lineHeight: 22,
    maxWidth: 280,
  },
  resultRow: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: 12,
    marginBottom: 8,
    paddingHorizontal: 14,
    paddingVertical: 12,
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "#E8ECF2",
    shadowColor: "#000",
    shadowOpacity: 0.03,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 1 },
    elevation: 1,
  },
  resultRowPressed: {
    backgroundColor: "#F7F9FC",
  },
  resultTextBlock: {
    flex: 1,
    minWidth: 0,
  },
  resultDisplayName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#121926",
  },
  resultUsername: {
    fontSize: 14,
    color: "#667085",
    marginTop: 2,
  },
  resultRowTrailing: {
    flexDirection: "row",
    alignItems: "center",
    marginLeft: 8,
  },
  existingChatBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    backgroundColor: "#DCFCE7",
    marginRight: 4,
  },
  existingChatBadgeText: {
    marginLeft: 4,
    fontSize: 11,
    fontWeight: "700",
    color: "#15803D",
    letterSpacing: 0.2,
  },
  resultChevron: {
    marginLeft: 2,
  },
});
