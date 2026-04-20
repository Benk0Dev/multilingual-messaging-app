import React from "react";
import { View, Pressable, StyleSheet } from "react-native";
import { useTheme } from "@/src/theme";
import { Text } from "@/src/components/ui/Text";
import { Avatar } from "@/src/components/ui/Avatar";

interface ProfileHeroProps {
    displayName: string;
    username: string;
    email?: string | null;
    pictureUrl?: string | null;
    userId?: string;
    onPress?: () => void;
}

const AVATAR_SIZE = 140;

export function ProfileHero({
    displayName,
    username,
    email,
    pictureUrl,
    userId,
    onPress,
}: ProfileHeroProps) {
    const { colors, spacing } = useTheme();

    const subtext = email ? `@${username} · ${email}` : `@${username}`;

    return (
        <Pressable
            onPress={onPress}
            disabled={!onPress}
            style={({ pressed }) => [
                styles.container,
                {
                    paddingHorizontal: spacing.lg,
                    paddingVertical: spacing.xl,
                    opacity: pressed && onPress ? 0.7 : 1,
                },
            ]}
        >
            <Avatar
                name={displayName}
                size={AVATAR_SIZE}
                imageUrl={pictureUrl}
                userId={userId}
            />
            <Text
                variant="screenTitle"
                align="center"
                style={{ marginTop: spacing.md }}
                numberOfLines={1}
            >
                {displayName}
            </Text>
            <Text
                variant="secondary"
                align="center"
                color={colors.textSecondary}
                style={{ marginTop: spacing.xs }}
                numberOfLines={1}
            >
                {subtext}
            </Text>
        </Pressable>
    );
}

const styles = StyleSheet.create({
    container: {
        alignItems: "center",
    },
});
