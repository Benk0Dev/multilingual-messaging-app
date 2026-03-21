import { Chat } from "@app/shared-types/models";
import { useEffect, useState } from "react";
import { FlatList, Pressable, Text, View } from "react-native";
import { router } from "expo-router";
import { getChats } from "@/src/api/chats";
import { getMe } from "@/src/api/users";
import { logout } from "../../../src/auth/authService";

export default function ChatsScreen() {
  const [chats, setChats] = useState<Chat[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [myUserId, setMyUserId] = useState<string | null>(null);

  async function loadChats() {
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
  }

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
    loadChats();
    loadMe();
  }, []);

  return (
    <View style={{ flex: 1 }}>
      <FlatList
        data={chats}
        keyExtractor={(c) => c.id}
        refreshing={loading}
        onRefresh={() => loadChats()}
        contentContainerStyle={{ paddingBottom: 16 }}
        renderItem={({ item }) => (
          <Pressable
            onPress={() => router.push({ pathname: "/chats/[chatId]", params: { chatId: item.id } })}
            style={({ pressed }) => ({
              padding: 16,
              borderBottomWidth: 1,
              borderColor: "#e5e7eb",
              opacity: pressed ? 0.85 : 1,
            })}
          >
            <Text style={{ fontSize: 16, fontWeight: "600" }}>
              {item.members.find((m) => m.id !== myUserId)?.displayName}
            </Text>
          </Pressable>
        )}
      />

      {error && (
        <Text style={{ color: "#ef4444", textAlign: "center", marginVertical: 16, paddingHorizontal: 16 }}>
          {error}
        </Text>
      )}

      <Pressable
        onPress={onLogout}
        style={({ pressed }) => ({
          marginHorizontal: 16,
          marginBottom: 32,
          backgroundColor: "#ef4444",
          padding: 12,
          borderRadius: 8,
          opacity: pressed ? 0.85 : 1,
        })}
      >
        <Text style={{ color: "#fff", fontSize: 16, fontWeight: "600", textAlign: "center" }}>Log out</Text>
      </Pressable>
    </View>
  );
}
