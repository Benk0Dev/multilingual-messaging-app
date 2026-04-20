import React, { forwardRef, useImperativeHandle, useRef } from "react";
import {
    View,
    TextInput,
    Pressable,
    StyleSheet,
} from "react-native";
import { useTheme, useInputTheme } from "@/src/theme";
import { Text } from "../ui/Text";

export interface OtpInputRef {
    focus: () => void;
}

interface OtpInputProps {
    length: number;
    value: string;
    onChange: (next: string) => void;
    error?: boolean;
    disabled?: boolean;
    autoFocus?: boolean;
}

export const OtpInput = forwardRef<OtpInputRef, OtpInputProps>(
    function OtpInput({ length, value, onChange, error, disabled, autoFocus }, ref) {
        const { colors, radii } = useTheme();
        const inputTheme = useInputTheme();
        const hiddenInputRef = useRef<TextInput>(null);

        useImperativeHandle(ref, () => ({
            focus: () => hiddenInputRef.current?.focus(),
        }));

        function handleChange(text: string) {
            const digitsOnly = text.replace(/\D/g, "").slice(0, length);
            onChange(digitsOnly);
        }

        return (
            <>
                <TextInput
                    ref={hiddenInputRef}
                    value={value}
                    onChangeText={handleChange}
                    keyboardType="number-pad"
                    maxLength={length}
                    autoComplete="one-time-code"
                    textContentType="oneTimeCode"
                    autoFocus={autoFocus}
                    editable={!disabled}
                    {...inputTheme}
                    style={styles.hiddenInput}
                    caretHidden
                />

                <Pressable
                    onPress={() => hiddenInputRef.current?.focus()}
                    style={styles.row}
                >
                    {Array.from({ length }).map((_, i) => {
                        const digit = value[i] ?? "";
                        const isFocused = i === value.length;
                        return (
                            <View
                                key={i}
                                style={[
                                    styles.box,
                                    {
                                        backgroundColor: colors.otpBoxBg,
                                        borderColor: error
                                            ? colors.error
                                            : isFocused
                                            ? colors.primary
                                            : colors.border,
                                        borderRadius: radii.otpBox,
                                    },
                                ]}
                            >
                                <Text variant="sectionHeader">{digit}</Text>
                            </View>
                        );
                    })}
                </Pressable>
            </>
        );
    }
);

const styles = StyleSheet.create({
    row: {
        flexDirection: "row",
        justifyContent: "space-between",
        gap: 6,
    },
    box: {
        flex: 1,
        height: 52,
        borderWidth: 1.5,
        alignItems: "center",
        justifyContent: "center",
    },
    hiddenInput: {
        position: "absolute",
        opacity: 0,
        height: 1,
        width: 1,
    },
});
