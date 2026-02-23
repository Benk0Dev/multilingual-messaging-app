import "react-native-get-random-values";
import { Stack } from "expo-router";
import { useEffect } from "react";
import { router } from "expo-router";
import { hasSession } from "../src/auth/session";

export default function RootLayout() {
  useEffect(() => {
    (async () => {
      const ok = await hasSession();
      router.replace(ok ? "/(app)/chats" : "/(auth)/test/dev-auth-test"); // Temporary
    })();
  }, []);

  return <Stack screenOptions={{ headerShown: false }} />;
}