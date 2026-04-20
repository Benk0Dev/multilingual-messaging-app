import React from "react";
import { Pressable, StyleSheet, type ViewStyle } from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "@/src/theme";

interface BackButtonProps {
    onPress?: () => void;
    disabled?: boolean;
    style?: ViewStyle;
}

export function BackButton({ onPress, disabled, style }: BackButtonProps) {
    const { colors } = useTheme();

    const handlePress = () => {
        if (disabled) return;
        if (onPress) onPress();
        else router.back();
    };

    return (
        <Pressable
            onPress={handlePress}
            hitSlop={12}
            disabled={disabled}
            style={({ pressed }) => [
                styles.button,
                { opacity: pressed ? 0.5 : disabled ? 0.4 : 1 },
                style,
            ]}
        >
            <Ionicons
                name="chevron-back"
                size={24}
                color={colors.textPrimary}
            />
        </Pressable>
    );
}

const styles = StyleSheet.create({
    button: {
        marginLeft: -2,
    },
});
