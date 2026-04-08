import "react-native-get-random-values";
import { Stack } from "expo-router";
import { useEffect } from "react";
import { router } from "expo-router";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { KeyboardProvider } from "react-native-keyboard-controller";
import { hasSession } from "../src/auth/session";
import { ThemeProvider, useTheme } from "../src/theme";
import { StatusBar } from "react-native";

function RootNavigator() {
  const { colors, isDark } = useTheme();

  useEffect(() => {
    (async () => {
      const ok = await hasSession();
      // router.replace(ok ? "/(app)/chats" : "/(auth)/start");
      router.replace(ok ? "/(app)/chats" : "/(auth)/test/dev-auth-test"); // Temporary
    })();
  }, []);

  return (
    <>
      <StatusBar
        barStyle={isDark ? "light-content" : "dark-content"}
        backgroundColor={colors.bg}
      />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: colors.bg },
          animation: "slide_from_right",
        }}
      />
    </>
  );
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <KeyboardProvider>
          <RootNavigator />
        </KeyboardProvider>
      </ThemeProvider> 
    </SafeAreaProvider>
  );
}