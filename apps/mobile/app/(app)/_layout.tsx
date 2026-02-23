import { Stack } from "expo-router";

export default function AppLayout() {
  return (
    <Stack>
      <Stack.Screen name="(app)/chats/index" options={{ title: "Chats", headerShown: true }} />
        <Stack.Screen name="(app)/chats/[chatId]" options={{ headerShown: false }} />
    </Stack>
  );
}
