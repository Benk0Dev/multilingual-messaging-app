import React from "react";
import { View, Pressable, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "../../theme";
import { Text } from "./Text";
import { Avatar } from "./Avatar";
import { BackButton } from "./BackButton";

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
    transparent?: boolean;
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
    transparent = false,
}: DetailedScreenHeaderProps) {
    const { colors, spacing, avatarSizes } = useTheme();
    const insets = useSafeAreaInsets();

    return (
        <View
            style={[
                styles.container,
                {
                    paddingTop: insets.top + spacing.sm,
                    backgroundColor: transparent ? "transparent" : colors.headerBg,
                    borderBottomColor: transparent ? "transparent" : colors.border,
                },
            ]}
        >
            <View style={styles.row}>
                {showBack && (
                    <BackButton />
                )}

                <Pressable
                    onPress={onTitlePress}
                    disabled={!onTitlePress}
                    style={({ pressed }) => [
                        styles.titleArea,
                        { opacity: pressed && onTitlePress ? 0.7 : 1 },
                    ]}
                >
                    {avatarName && (
                        <Avatar
                            name={avatarName}
                            size={avatarSizes.md}
                            imageUrl={avatarImageUrl}
                            userId={avatarUserId}
                        />
                    )}

                    <View style={styles.titleBlock}>
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
                    </View>
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
    titleArea: {
        flex: 1,
        flexDirection: "row",
        alignItems: "center",
        gap: 10,
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
