import { Stack } from "expo-router";

export default function AuthLayout() {
    return (
        <Stack screenOptions={{ headerShown: true }}>
            <Stack.Screen name="start" options={{ title: "Sign in" }} />
            {/* <Stack.Screen name="otp" options={{ title: "Enter code" }} /> */}
            <Stack.Screen name="(auth)/test/dev-auth-test" options={{ title: "Dev Auth Test" }} /> {/* Temporary */}
        </Stack>
    );
}