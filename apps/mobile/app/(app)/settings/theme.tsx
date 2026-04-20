import { View, Pressable, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "@/src/theme";
import { Text } from "@/src/components/ui/Text";
import { Divider } from "@/src/components/ui/Divider";
import { DetailedScreenHeader as ScreenHeader } from "@/src/components/ui/DetailedScreenHeader";
import { useThemeStore, type ThemeMode } from "@/src/store/themeStore";

type Option = {
    value: ThemeMode;
    label: string;
    icon: keyof typeof Ionicons.glyphMap;
    description: string;
};

const OPTIONS: Option[] = [
    {
        value: "system",
        label: "System",
        icon: "phone-portrait-outline",
        description: "Match your device",
    },
    {
        value: "light",
        label: "Light",
        icon: "sunny-outline",
        description: "Always light",
    },
    {
        value: "dark",
        label: "Dark",
        icon: "moon-outline",
        description: "Always dark",
    },
];

export default function ThemeSettings() {
    const { colors, spacing } = useTheme();
    const mode = useThemeStore((s) => s.mode);
    const setMode = useThemeStore((s) => s.setMode);

    async function onSelect(next: ThemeMode) {
        if (next === mode) return;
        await setMode(next);
    }

    return (
        <View style={[styles.screen, { backgroundColor: colors.bg }]}>
            <ScreenHeader title="Theme Settings" showBack />

            <View style={{ marginTop: spacing.sm }}>
                {OPTIONS.map((opt, i) => {
                    const selected = mode === opt.value;
                    return (
                        <View key={opt.value}>
                            <Pressable
                                onPress={() => onSelect(opt.value)}
                                style={({ pressed }) => [
                                    styles.row,
                                    {
                                        paddingHorizontal: spacing.lg,
                                        paddingVertical: spacing.md,
                                        backgroundColor: selected
                                            ? colors.primarySubtle
                                            : pressed
                                            ? colors.primarySubtle
                                            : "transparent",
                                    },
                                ]}
                            >
                                <Ionicons
                                    name={opt.icon}
                                    size={18}
                                    color={colors.textSecondary}
                                    style={{ marginRight: spacing.md }}
                                />
                                <View style={{ flex: 1 }}>
                                    <Text variant="body">{opt.label}</Text>
                                </View>
                                {selected && (
                                    <Ionicons name="checkmark" size={20} color={colors.primary} />
                                )}
                            </Pressable>
                            {i < OPTIONS.length - 1 && <Divider />}
                        </View>
                    );
                })}
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    screen: {
        flex: 1,
    },
    row: {
        flexDirection: "row",
        alignItems: "center",
    },
});
