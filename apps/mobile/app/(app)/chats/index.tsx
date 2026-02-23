import { Chat } from "@app/shared-types/models";
import { useEffect, useState } from "react";
import { FlatList, Pressable, Text, TextInput, View } from "react-native";
import { router } from "expo-router";
import { getChatsForUser } from "@/src/api/chats";
import { getDevUserId, setDevUserId, clearDevUserId } from "../../../src/devUser";

export default function ChatsScreen() {
  const [devUserId, setDevUserIdState] = useState<string | null>(null);
  const [input, setInput] = useState("");
  const [chats, setChats] = useState<Chat[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const id = await getDevUserId();
      setDevUserIdState(id);
      if (id) setInput(id);
    })();
  }, []);

  async function loadChats(userId: string) {
    setLoading(true);
    setError(null);

    try {
      const items = await getChatsForUser(userId);
      setChats(items);
    } catch (e: any) {
      setError(e?.message ?? "Failed to load chats");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (devUserId) loadChats(devUserId);
  }, [devUserId]);

  return (
    <View style={{ flex: 1 }}>
      <View style={{ padding: 12, borderBottomWidth: 1, gap: 8 }}>
        <Text style={{ fontWeight: "600" }}>Dev userId (per device)</Text>
        <TextInput
          value={input}
          onChangeText={setInput}
          autoCapitalize="none"
          placeholder="Paste userId (UUID)"
          style={{ borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, height: 44 }}
        />
        <View style={{ flexDirection: "row", gap: 8 }}>
          <Pressable
            onPress={async () => {
              const id = input.trim();
              if (!id) return;
              await setDevUserId(id);
              setDevUserIdState(id);
            }}
            style={{ borderWidth: 1, borderRadius: 10, padding: 10 }}
          >
            <Text style={{ fontWeight: "600" }}>Save</Text>
          </Pressable>

          <Pressable
            onPress={async () => {
              await clearDevUserId();
              setDevUserIdState(null);
              setChats([]);
              setInput("");
            }}
            style={{ borderWidth: 1, borderRadius: 10, padding: 10 }}
          >
            <Text style={{ fontWeight: "600" }}>Clear</Text>
          </Pressable>
        </View>

        {devUserId ? <Text>Current: {devUserId}</Text> : <Text>Set a userId to load chats.</Text>}
        {error ? <Text>Error: {error}</Text> : null}
      </View>

      <FlatList
        data={chats}
        keyExtractor={(c) => c.id}
        refreshing={loading}
        onRefresh={() => (devUserId ? loadChats(devUserId) : undefined)}
        renderItem={({ item }) => (
          <Pressable
            onPress={() => router.push({ pathname: "/chats/[chatId]", params: { chatId: item.id } })}
            style={{ padding: 16, borderBottomWidth: 1 }}
          >
            <Text style={{ fontSize: 16, fontWeight: "600" }}>
              {item.id.slice(0, 8)}
            </Text>
          </Pressable>
        )}
      />
    </View>
  );
}