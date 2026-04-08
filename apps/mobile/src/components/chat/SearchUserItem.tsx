import React from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../../theme";
import { Text } from "../ui/Text";
import { Avatar } from "../ui/Avatar";

interface SearchUserItemProps {
    name: string;
    username: string;
    userId: string;
    imageUrl?: string | null;
    preferredLang?: string;
    onPress: () => void;
}

export function SearchUserItem({
    name,
    username,
    userId,
    imageUrl,
    preferredLang,
    onPress,
}: SearchUserItemProps) {
    const { colors, spacing, avatarSizes } = useTheme();

    return (
        <Pressable
            onPress={onPress}
            style={({ pressed }) => [
                styles.container,
                {
                    paddingHorizontal: spacing.lg,
                    paddingVertical: 10,
                    backgroundColor: pressed ? colors.primarySubtle : "transparent",
                },
            ]}
        >
            <Avatar
                name={name}
                size={avatarSizes.lg}
                imageUrl={imageUrl}
                userId={userId}
            />
            <View style={styles.content}>
                <Text variant="bodyBold" numberOfLines={1}>
                    {name}
                </Text>
                <Text variant="secondary" color={colors.textSecondary} numberOfLines={1}>
                    @{username}
                    {preferredLang ? ` · ${preferredLang.toUpperCase()}` : ""}
                </Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color={colors.textTertiary} />
        </Pressable>
    );
}

const styles = StyleSheet.create({
    container: {
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
    },
    content: {
        flex: 1,
        minWidth: 0,
    },
});
