import React from 'react';
import { Pressable, StyleSheet, type ViewStyle } from 'react-native';
import { useTheme } from '../../theme';
import { Text } from './Text';

interface ButtonProps {
    label: string;
    onPress: () => void;
    variant?: 'primary' | 'secondary' | 'destructive';
    disabled?: boolean;
    style?: ViewStyle;
}

export function Button({
    label,
    onPress,
    variant = 'primary',
    disabled = false,
    style,
}: ButtonProps) {
    const { colors, radii } = useTheme();

    const bgMap = {
        primary: colors.primary,
        secondary: 'transparent',
        destructive: 'transparent',
    };

    const textMap = {
        primary: colors.textOnPrimary,
        secondary: colors.primary,
        destructive: colors.error,
    };

    const borderMap = {
        primary: colors.primary,
        secondary: colors.primary,
        destructive: colors.error,
    };

    return (
        <Pressable
            onPress={onPress}
            disabled={disabled}
            style={({ pressed }) => [
                styles.base,
                {
                    backgroundColor: bgMap[variant],
                    borderRadius: radii.button,
                    borderWidth: variant !== 'primary' ? 1.5 : 0,
                    borderColor: borderMap[variant],
                    opacity: disabled ? 0.5 : pressed ? 0.85 : 1,
                },
                style,
            ]}
        >
            <Text variant="button" color={textMap[variant]}>
                {label}
            </Text>
        </Pressable>
    );
}

const styles = StyleSheet.create({
    base: {
        paddingVertical: 13,
        paddingHorizontal: 24,
        alignItems: 'center',
        justifyContent: 'center',
    },
});
