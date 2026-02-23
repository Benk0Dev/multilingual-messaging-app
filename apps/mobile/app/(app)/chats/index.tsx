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
    }
    finally {
      setLoading(false);
    }
  }

  async function onLogout() {
    console.log("logout");
    await logout();
    router.replace("/(auth)/test/dev-auth-test");
  }

  useEffect(() => {
    loadChats();
    loadMe();
  }, []);

  return (
    <View>
      <FlatList
        data={chats}
        keyExtractor={(c) => c.id}
        refreshing={loading}
        onRefresh={() => loadChats()}
        renderItem={({ item }) => (
          <Pressable
            onPress={() => router.push({ pathname: "/chats/[chatId]", params: { chatId: item.id } })}
            style={{ padding: 16, borderBottomWidth: 1 }}
          >
            <Text style={{ fontSize: 16, fontWeight: "600" }}>
              {item.members.find((m) => m.id !== myUserId)?.displayName}
            </Text>
          </Pressable>
        )}
      />

      {error && <Text style={{ color: "red", textAlign: "center", marginVertical: 16 }}>{error}</Text>}

      <Pressable
        onPress={() => onLogout()}
        style={{ padding: 16, backgroundColor: "red" }}
      >
        <Text style={{ fontSize: 16, fontWeight: "600" }}>Logout</Text>
      </Pressable>
    </View>
  );
}