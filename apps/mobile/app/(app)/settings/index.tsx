import { View, StyleSheet } from "react-native";
import { Button } from "@/src/components/ui/Button";
import { router } from "expo-router";
import { logout } from "@/src/auth/authService";
import { BottomTabBar } from "@/src/components/navigation/BottomTabBar";
import { useUserStore } from "@/src/store/userStore";
import { SimpleScreenHeader as ScreenHeader } from "@/src/components/ui/SimpleScreenHeader";

export default function SettingsScreen() {
    const me = useUserStore((state) => state.me);

    async function onLogout() {
        await logout();
        router.replace("/(auth)/test/dev-auth-test");
    }

    return (
        <View style={styles.screen}>
            <ScreenHeader title="Settings" />
            <Button
                onPress={onLogout}
                label="Log out"
                variant="destructive"
            />
            <BottomTabBar
                active="settings"
                onTabPress={(tab) => {
                    if (tab !== "settings") {
                        router.replace(`/(app)/${tab}`);
                    }
                }}
                userDisplayName={me?.displayName}
                userImageUrl={me?.pictureUrl}
                userId={me?.id}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    screen: {
        flex: 1,
        justifyContent: "space-between",
        alignItems: "center",
        height: "100%",
    },
});