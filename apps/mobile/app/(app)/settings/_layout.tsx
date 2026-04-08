import { Stack } from "expo-router";
import { useTheme } from "@/src/theme";

export default function ChatsLayout() {
    const { colors } = useTheme();

    return (
        <Stack
            screenOptions={{
                headerShown: false,
                contentStyle: { backgroundColor: colors.bg },
            }}
        >
            <Stack.Screen name="index" />
        </Stack>
    );
}