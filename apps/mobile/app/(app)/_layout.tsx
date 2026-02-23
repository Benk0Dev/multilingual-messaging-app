import { Stack } from "expo-router";

export default function AppLayout() {
  return (
    <Stack>
      <Stack.Screen name="chats/index" options={{ title: "Chats", headerShown: true }} />
        <Stack.Screen name="chats/[chatId]" options={{ title: "Chat", headerShown: true }} />
    </Stack>
  );
}
