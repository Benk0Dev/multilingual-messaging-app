import { useMemo, useState } from "react";
import { View, FlatList, Pressable, TextInput, StyleSheet } from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LanguageCode } from "@app/shared-types/enums";
import { LanguageDisplayName, LanguageFlag } from "@/src/constants/languages";
import { useTheme, useInputTheme } from "@/src/theme";
import { Text } from "@/src/components/ui/Text";
import { Button } from "@/src/components/ui/Button";
import { Divider } from "@/src/components/ui/Divider";
import { ProgressBar } from "@/src/components/onboarding/ProgressBar";
import { OnboardingScreen } from "@/src/components/onboarding/OnboardingScreen";
import { useOnboardingStore } from "@/src/store/onboardingStore";
import { logout } from "@/src/auth/authService";
import { Header } from "@/src/components/onboarding/Header";

type LanguageOption = {
    code: LanguageCode;
    name: string;
    flag: string;
};

const LANGUAGE_OPTIONS: LanguageOption[] = Object.values(LanguageCode)
    .map((code) => ({ code, name: LanguageDisplayName[code], flag: LanguageFlag[code] }))
    .sort((a, b) => a.name.localeCompare(b.name));

export default function LanguageStep() {
    const { colors, spacing, radii } = useTheme();
    const inputTheme = useInputTheme();
    const insets = useSafeAreaInsets();
    const saved = useOnboardingStore((s) => s.preferredLang);
    const setPreferredLang = useOnboardingStore((s) => s.setPreferredLang);
    const [selected, setSelected] = useState<LanguageCode | null>(saved);
    const [query, setQuery] = useState("");
    const [loggingOut, setLoggingOut] = useState(false);

    const filtered = useMemo(() => {
        const q = query.trim().toLowerCase();
        if (!q) return LANGUAGE_OPTIONS;
        return LANGUAGE_OPTIONS.filter(
            (opt) =>
                opt.name.toLowerCase().includes(q) ||
                opt.code.toLowerCase().includes(q)
        );
    }, [query]);

    function onNext() {
        if (!selected) return;
        setPreferredLang(selected);
        router.push("/(auth)/onboarding/username");
    }

    async function onUseDifferentEmail() {
        if (loggingOut) return;
        setLoggingOut(true);
        await logout();
    }

    const hasQuery = query.trim().length > 0;

    return (
        <OnboardingScreen keyboardOffset={-(insets.bottom + spacing.md)}>
            <ProgressBar step={1} totalSteps={4} />

            <Header
                title="Select your language"
                subtitle="Messages you receive will be translated into this language"
                showBack={false}
            />

            <View style={[styles.content, { marginTop: spacing.xs }]}>
                <View style={{ marginBottom: spacing.sm, paddingHorizontal: spacing.lg }}>
                    <View
                        style={[
                            styles.searchBar,
                            {
                                backgroundColor: colors.searchBarBg,
                                borderColor: colors.border,
                                borderRadius: radii.search,
                            },
                        ]}
                    >
                        <Ionicons
                            name="search"
                            size={16}
                            color={hasQuery ? colors.primary : colors.textTertiary}
                        />
                        <TextInput
                            value={query}
                            onChangeText={setQuery}
                            placeholder="Search languages..."
                            {...inputTheme}
                            autoCapitalize="none"
                            autoCorrect={false}
                            style={[styles.searchInput, { color: colors.textPrimary, lineHeight: 19 }]}
                        />
                        {hasQuery && (
                            <Pressable onPress={() => setQuery("")}>
                                <Ionicons name="close-circle" size={18} color={colors.textTertiary} />
                            </Pressable>
                        )}
                    </View>
                </View>

                <FlatList
                    data={filtered}
                    keyExtractor={(item) => item.code}
                    keyboardShouldPersistTaps="handled"
                    style={{ flex: 1 }}
                    ItemSeparatorComponent={() => <Divider indent={spacing.lg} />}
                    renderItem={({ item }) => {
                        const isSelected = selected === item.code;
                        return (
                            <Pressable
                                onPress={() => setSelected(item.code)}
                                style={({ pressed }) => [
                                    styles.row,
                                    {
                                        paddingHorizontal: spacing.lg,
                                        backgroundColor: isSelected
                                            ? colors.primarySubtle
                                            : pressed
                                            ? colors.primarySubtle
                                            : "transparent",
                                    },
                                ]}
                            >
                                <Text variant="body" style={styles.flag}>
                                    {item.flag}
                                </Text>
                                <Text variant="body" style={{ flex: 1 }}>
                                    {item.name}
                                </Text>
                                {isSelected && (
                                    <Ionicons name="checkmark" size={20} color={colors.primary} />
                                )}
                            </Pressable>
                        );
                    }}
                />

                <View
                    style={[
                        styles.footer,
                        {
                            paddingHorizontal: spacing.lg,
                            paddingTop: spacing.md,
                            borderTopColor: colors.border,
                        },
                    ]}
                >
                    <Button label="Continue" onPress={onNext} disabled={!selected} />
                    <Pressable
                        onPress={onUseDifferentEmail}
                        disabled={loggingOut}
                        style={{ paddingVertical: spacing.md, alignItems: "center" }}
                    >
                        <Text variant="secondary" color={colors.textSecondary}>
                            Use a different email
                        </Text>
                    </Pressable>
                </View>
            </View>
        </OnboardingScreen>
    );
}

const styles = StyleSheet.create({
    content: {
        flex: 1,
    },
    searchBar: {
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
        borderWidth: 0.5,
        paddingHorizontal: 12,
        paddingVertical: 9,
    },
    searchInput: {
        flex: 1,
        fontSize: 15,
        paddingVertical: 0,
    },
    row: {
        flexDirection: "row",
        alignItems: "center",
        paddingVertical: 12,
        gap: 12,
    },
    flag: {
        fontSize: 22,
    },
    footer: {
        borderTopWidth: 0.5,
    },
});