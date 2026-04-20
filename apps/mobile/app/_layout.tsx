import "react-native-get-random-values";
import { Stack } from "expo-router";
import { useEffect, useState } from "react";
import { router, useSegments } from "expo-router";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { KeyboardProvider } from "react-native-keyboard-controller";
import { hasSession } from "../src/auth/session";
import { bootstrap } from "../src/auth/authService";
import { useUserStore } from "../src/store/userStore";
import { ThemeProvider, useTheme } from "../src/theme";
import { StatusBar } from "react-native";

function RootNavigator() {
    const { colors, isDark } = useTheme();
    const me = useUserStore((s) => s.me);
    const checked = useUserStore((s) => s.checked);
    const segments = useSegments();

    // Check the session + bootstrap the user on mount
    useEffect(() => {
        (async () => {
            const hasToken = await hasSession();
            if (!hasToken) {
                useUserStore.getState().setChecked(true);
                return;
            }
            try {
                await bootstrap();
            } catch (e) {
                console.error("Bootstrap failed", e);
                useUserStore.getState().setChecked(true);
            }
        })();
    }, []);

    // Routing
    useEffect(() => {
        if (!checked) return;

        const inAuthGroup = segments[0] === "(auth)";
        const inOnboarding = inAuthGroup && segments[1] === "onboarding";
        const inApp = segments[0] === "(app)";

        if (!me) {
            (async () => {
                const hasToken = await hasSession();
                if (hasToken && !inOnboarding) {
                    router.replace("/(auth)/onboarding/language");
                } else if (!hasToken && !inAuthGroup) {
                    router.replace("/(auth)/start");
                }
            })();
        }
        else if (!inApp) {
            router.replace("/(app)/chats");
        }
    }, [checked, me, segments]);

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
