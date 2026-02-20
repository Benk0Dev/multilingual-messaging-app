import { Stack } from "expo-router";

export default function AppLayout() {
  return (
    <Stack screenOptions={{ headerShown: true }}>
      <Stack.Screen name="chats/index" options={{ title: "Chats" }} />
        <Stack.Screen name="chats/[chatId]" options={{ title: "Chat" }} />
    </Stack>
  );
}
