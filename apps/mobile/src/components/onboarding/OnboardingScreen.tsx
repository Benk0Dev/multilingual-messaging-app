import React from "react";
import {
    View,
    StyleSheet,
    Platform,
    Keyboard,
    TouchableWithoutFeedback,
    type ViewStyle,
} from "react-native";
import { KeyboardAvoidingView } from "react-native-keyboard-controller";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "@/src/theme";

interface OnboardingScreenProps {
    children: React.ReactNode;
    keyboardOffset?: number;
    style?: ViewStyle;
}

export function OnboardingScreen({ children, keyboardOffset, style }: OnboardingScreenProps) {
    const { colors, spacing } = useTheme();
    const insets = useSafeAreaInsets();

    return (
        <KeyboardAvoidingView
            style={{ flex: 1, backgroundColor: colors.bg }}
            behavior={Platform.OS === "ios" ? "padding" : "height"}
            keyboardVerticalOffset={keyboardOffset ?? -insets.bottom}
        >
            <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
                <View
                    style={[
                        styles.container,
                        {
                            paddingTop: insets.top,
                            paddingBottom: insets.bottom + spacing.md,
                        },
                        style,
                    ]}
                >
                    {children}
                </View>
            </TouchableWithoutFeedback>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
});