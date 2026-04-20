import React, { forwardRef } from "react";
import {
    View,
    TextInput,
    StyleSheet,
    type TextInputProps,
    type ViewStyle,
} from "react-native";
import { useTheme, useInputTheme } from "@/src/theme";
import { Text } from "./Text";

interface TextInputFieldProps extends Omit<TextInputProps, "style"> {
    label?: string;
    error?: boolean;
    success?: boolean;
    rightAdornment?: React.ReactNode;
    leftAdornment?: React.ReactNode;
    containerStyle?: ViewStyle;
}

export const TextInputField = forwardRef<TextInput, TextInputFieldProps>(
    function TextInputField(
        { label, error, success, rightAdornment, leftAdornment, containerStyle, ...props },
        ref
    ) {
        const { colors, spacing, radii } = useTheme();
        const inputTheme = useInputTheme();

        return (
            <View style={containerStyle}>
                {label && (
                    <Text
                        variant="caption"
                        color={colors.textSecondary}
                        style={{
                            marginBottom: spacing.xs,
                        }}
                    >
                        {label}
                    </Text>
                )}
                <View
                    style={[
                        styles.row,
                        {
                            backgroundColor: colors.inputBg,
                            borderColor: error ? colors.error : success ? colors.secondary : colors.border,
                            borderRadius: radii.input,
                            paddingHorizontal: 14,
                        },
                    ]}
                >
                    {leftAdornment}
                    <TextInput
                        ref={ref}
                        {...inputTheme}
                        {...props}
                        style={[styles.input, { color: colors.textPrimary }]}
                    />
                    {rightAdornment}
                </View>
            </View>
        );
    }
);

const styles = StyleSheet.create({
    row: {
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
        borderWidth: 1,
        minHeight: 48,
    },
    input: {
        flex: 1,
        fontSize: 16,
        lineHeight: 19,
        paddingVertical: 12,
    },
});
