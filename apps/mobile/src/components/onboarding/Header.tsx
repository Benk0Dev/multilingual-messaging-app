import React from "react";
import { View, StyleSheet } from "react-native";
import { useTheme } from "@/src/theme";
import { Text } from "../ui/Text";
import { BackButton } from "../ui/BackButton";

interface HeaderProps {
    title: string;
    subtitle?: string;
    showBack?: boolean;
    onBackPress?: () => void;
    backDisabled?: boolean;
}

export function Header({
    title,
    subtitle,
    showBack = true,
    onBackPress,
    backDisabled,
}: HeaderProps) {
    const { colors, spacing } = useTheme();

    return (
        <View style={{
                paddingHorizontal: spacing.lg,
                paddingTop: spacing.lg,
                marginBottom: spacing.md,
            }}
        >
            <View style={styles.titleRow}>
                {showBack && (
                    <BackButton
                        onPress={onBackPress}
                        disabled={backDisabled}
                        style={styles.back}
                    />
                )}
                <View style={styles.textColumn}>
                    <Text variant="screenTitle">{title}</Text>
                </View>
            </View>
            {subtitle && (
                <Text
                    variant="secondary"
                    color={colors.textSecondary}
                    style={{ marginTop: spacing.xs }}
                >
                    {subtitle}
                </Text>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    titleRow: {
        flexDirection: "row",
        alignItems: "flex-start",
        gap: 8,
    },
    back: {
        marginTop: 2,
        marginLeft: 0,
    },
    textColumn: {
        flex: 1,
    },
});