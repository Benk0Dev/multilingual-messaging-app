import React from "react";
import { View, Pressable, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router } from "expo-router";
import { useTheme } from "../../theme";
import { Text } from "./Text";
import { Avatar } from "./Avatar";

interface DetailedScreenHeaderProps {
    title: string;
    subtitle?: string;
    showBack?: boolean;
    avatarName?: string;
    avatarImageUrl?: string | null;
    avatarUserId?: string;
    rightIcon?: keyof typeof Ionicons.glyphMap;
    onRightPress?: () => void;
    onTitlePress?: () => void;
}

export function DetailedScreenHeader({
    title,
    subtitle,
    showBack = true,
    avatarName,
    avatarImageUrl,
    avatarUserId,
    rightIcon,
    onRightPress,
    onTitlePress,
}: DetailedScreenHeaderProps) {
    const { colors, spacing, avatarSizes } = useTheme();
    const insets = useSafeAreaInsets();

    return (
        <View
            style={[
                styles.container,
                {
                    paddingTop: insets.top + spacing.sm,
                    backgroundColor: colors.headerBg,
                    borderBottomColor: colors.border,
                },
            ]}
        >
            <View style={styles.row}>
                {showBack && (
                    <Pressable
                        onPress={() => router.back()}
                        hitSlop={12}
                        style={styles.backButton}
                    >
                        <Ionicons
                            name="chevron-back"
                            size={24}
                            color={colors.textPrimary}
                        />
                    </Pressable>
                )}

                {avatarName && (
                    <Avatar
                        name={avatarName}
                        size={avatarSizes.md}
                        imageUrl={avatarImageUrl}
                        userId={avatarUserId}
                    />
                )}

                <Pressable
                    onPress={onTitlePress}
                    disabled={!onTitlePress}
                    style={styles.titleBlock}
                >
                    <Text
                        variant="bodyBold"
                        numberOfLines={1}
                    >
                        {title}
                    </Text>
                    {subtitle && (
                        <Text
                            variant="caption"
                            color={colors.secondary}
                        >
                            {subtitle}
                        </Text>
                    )}
                </Pressable>

                {rightIcon && onRightPress ? (
                    <Pressable
                        onPress={onRightPress}
                        hitSlop={12}
                        style={styles.rightButton}
                    >
                        <Ionicons
                            name={rightIcon}
                            size={22}
                            color={colors.textSecondary}
                        />
                    </Pressable>
                ) : (
                    <View style={styles.rightSpacer} />
                )}
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        paddingBottom: 10,
        paddingHorizontal: 12,
        borderBottomWidth: 0.5,
    },
    row: {
        flexDirection: "row",
        alignItems: "center",
        gap: 10,
    },
    backButton: {
        marginRight: -2,
    },
    titleBlock: {
        flex: 1,
        justifyContent: "center",
    },
    rightButton: {
        padding: 4,
    },
    rightSpacer: {
        width: 30,
    },
});
