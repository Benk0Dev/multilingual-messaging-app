import { useEffect, useState } from "react";
import { View, ScrollView, StyleSheet, Linking } from "react-native";
import { router } from "expo-router";
import { logout } from "@/src/auth/authService";
import { useUserStore } from "@/src/store/userStore";
import { useTheme } from "@/src/theme";
import { LanguageDisplayName } from "@/src/constants/languages";
import { LanguageCode } from "@app/shared-types/enums";
import { SimpleScreenHeader as ScreenHeader } from "@/src/components/ui/SimpleScreenHeader";
import { BottomTabBar } from "@/src/components/navigation/BottomTabBar";
import { ProfileHero } from "@/src/components/settings/ProfileHero";
import { SettingsSection } from "@/src/components/settings/SettingsSection";
import { SettingsRow } from "@/src/components/settings/SettingsRow";
import { useThemeStore } from "@/src/store/themeStore";
import { getEmailFromIdToken } from "@/src/auth/idTokenClaims";

const FEEDBACK_EMAIL = "dev.benko@gmail.com";
const FEEDBACK_SUBJECT = "Lingua feedback";
const FEEDBACK_BODY = "Thanks for testing Lingua! Please describe the issue or suggestion below.\n\n";

const THEME_LABEL: Record<"system" | "light" | "dark", string> = {
    system: "System",
    light: "Light",
    dark: "Dark",
};

export default function SettingsScreen() {
    const { spacing } = useTheme();
    const me = useUserStore((s) => s.me);
    const themeMode = useThemeStore((s) => s.mode);
    const [email, setEmail] = useState<string | null>(null);

    useEffect(() => {
        let cancelled = false;
        (async () => {
            const e = await getEmailFromIdToken();
            if (!cancelled) setEmail(e);
        })();
        return () => {
            cancelled = true;
        };
    }, []);

    if (!me) return null;

    const languageLabel = LanguageDisplayName[me.preferredLang as LanguageCode] ?? me.preferredLang;

    function onOpenEditProfile() {
        router.push("/(app)/settings/edit-profile");
    }

    function onOpenLanguage() {
        router.push("/(app)/settings/language");
    }

    function onOpenTheme() {
        router.push("/(app)/settings/theme");
    }

    async function onSendFeedback() {
        const url =
            `mailto:${FEEDBACK_EMAIL}` +
            `?subject=${encodeURIComponent(FEEDBACK_SUBJECT)}` +
            `&body=${encodeURIComponent(FEEDBACK_BODY)}`;

        try {
            await Linking.openURL(url);
        } catch (e) {
            console.warn("Failed to open mail client", e);
        }
    }

    async function onLogout() {
        await logout();
    }

    return (
        <View style={styles.screen}>
            <ScreenHeader title="Settings" />

            <ScrollView
                style={styles.scroll}
                contentContainerStyle={{ paddingBottom: spacing.xl }}
            >
                <ProfileHero
                    displayName={me.displayName}
                    username={me.username}
                    email={email}
                    pictureUrl={me.pictureUrl}
                    joinedAt={me.createdAt}
                    userId={me.id}
                    onPress={onOpenEditProfile}
                />

                <SettingsSection title="Preferences">
                    <SettingsRow
                        icon="language-outline"
                        label="Language"
                        value={languageLabel}
                        onPress={onOpenLanguage}
                        firstInGroup
                    />
                    <SettingsRow
                        icon="color-palette-outline"
                        label="Theme"
                        value={THEME_LABEL[themeMode]}
                        onPress={onOpenTheme}
                        lastInGroup
                    />
                </SettingsSection>

                <SettingsSection title="Feedback">
                    <SettingsRow
                        icon="mail-outline"
                        label="Send feedback"
                        onPress={onSendFeedback}
                        firstInGroup
                        lastInGroup
                    />
                </SettingsSection>

                <SettingsSection title="Account">
                    <SettingsRow
                        icon="log-out-outline"
                        label="Log out"
                        destructive
                        onPress={onLogout}
                        firstInGroup
                        lastInGroup
                    />
                </SettingsSection>
            </ScrollView>

            <BottomTabBar
                active="settings"
                onTabPress={(tab) => {
                    if (tab !== "settings") {
                        router.replace(`/(app)/${tab}`);
                    }
                }}
                userDisplayName={me.displayName}
                userImageUrl={me.pictureUrl}
                userId={me.id}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    screen: {
        flex: 1,
    },
    scroll: {
        flex: 1,
    },
});
