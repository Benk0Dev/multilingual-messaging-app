import React from "react";
import { View, Pressable, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "@/src/theme";
import { Text } from "@/src/components/ui/Text";

interface SettingsRowProps {
    icon: keyof typeof Ionicons.glyphMap;
    label: string;
    value?: string;
    showChevron?: boolean;
    onPress?: () => void;
    destructive?: boolean;
    disabled?: boolean;
    firstInGroup?: boolean;
    lastInGroup?: boolean;
}

export function SettingsRow({
    icon,
    label,
    value,
    showChevron = true,
    onPress,
    destructive,
    disabled,
    firstInGroup = false,
    lastInGroup = false,
}: SettingsRowProps) {
    const { colors, spacing, radii } = useTheme();

    const labelColor = destructive ? colors.error : colors.textPrimary;
    const iconColor = destructive ? colors.error : colors.textSecondary;

    const borderRadius = firstInGroup && lastInGroup
        ? {
            borderRadius: radii.card,
        }
        : firstInGroup
        ? {
            borderTopLeftRadius: radii.card,
            borderTopRightRadius: radii.card,
        }
        : lastInGroup
            ? {
                borderBottomLeftRadius: radii.card,
                borderBottomRightRadius: radii.card,
            }
            : {};

    return (
        <Pressable
            onPress={onPress}
            disabled={disabled || !onPress}
            style={({ pressed }) => [
                styles.row,
                {
                    paddingHorizontal: spacing.lg,
                    paddingVertical: spacing.md,
                    backgroundColor: pressed ? colors.primarySubtle : "transparent",
                    opacity: disabled ? 0.5 : 1,
                    ...borderRadius,
                },
            ]}
        >
            <Ionicons name={icon} size={20} color={iconColor} style={{ marginRight: spacing.md }} />
            <Text variant="body" color={labelColor} style={{ flex: 1 }}>
                {label}
            </Text>
            {value && (
                <Text variant="body" color={colors.textTertiary} style={{ marginRight: spacing.xs }}>
                    {value}
                </Text>
            )}
            {showChevron && !destructive && (
                <Ionicons name="chevron-forward" size={18} color={colors.textTertiary} />
            )}
        </Pressable>
    );
}

const styles = StyleSheet.create({
    row: {
        flexDirection: "row",
        alignItems: "center",
    },
});
