import { useState } from "react";
import {
    View,
    StyleSheet,
    Platform,
    Keyboard,
    TouchableWithoutFeedback,
} from "react-native";
import { KeyboardAvoidingView } from "react-native-keyboard-controller";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "@/src/theme";
import { Text } from "@/src/components/ui/Text";
import { Button } from "@/src/components/ui/Button";
import { TextInputField } from "@/src/components/ui/TextInputField";

// Minimal shape check - Cognito does the real validation
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const LOGO_SIZE = 72;

export default function StartScreen() {
    const { colors, spacing } = useTheme();
    const insets = useSafeAreaInsets();
    const [email, setEmail] = useState("");
    const isValid = EMAIL_REGEX.test(email.trim());

    function onContinue() {
        if (!isValid) return;
        const trimmed = email.trim().toLowerCase();

        router.push({
            pathname: "/(auth)/verify",
            params: { email: trimmed },
        });
    }

    return (
        <KeyboardAvoidingView
            style={{ flex: 1, backgroundColor: colors.bg }}
            behavior={Platform.OS === "ios" ? "padding" : "height"}
            keyboardVerticalOffset={-(insets.bottom)}
        >
            <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
                <View
                    style={[
                        styles.container,
                        {
                            paddingTop: insets.top + spacing.xxl,
                            paddingHorizontal: spacing.lg,
                            paddingBottom: insets.bottom + spacing.lg,
                        },
                    ]}
                >
                <View style={styles.body}>
                    <View style={[styles.logo, { backgroundColor: colors.primary }]}>
                        <Ionicons name="language" size={LOGO_SIZE/1.8} color="#FFFFFF" />
                    </View>
                    <Text
                        variant="welcomeTitle"
                        align="center"
                        style={{ marginTop: spacing.md }}
                    >
                        Lingua
                    </Text>
                    <Text
                        variant="sectionHeader"
                        align="center"
                        color={colors.textTertiary}
                        style={{ marginTop: spacing.xs }}
                    >
                        Chat without language barriers
                    </Text>
                    <View style={[
                        styles.form,
                        { marginTop: spacing.xxl }
                    ]}>
                        <TextInputField
                            value={email}
                            onChangeText={setEmail}
                            placeholder="Enter your email"
                            autoCapitalize="none"
                            autoCorrect={false}
                            autoComplete="email"
                            keyboardType="email-address"
                            returnKeyType="go"
                            onSubmitEditing={onContinue}
                        />
                    </View>
                </View>

                <View style={styles.footer}>
                    <Button label="Continue" onPress={onContinue} disabled={!isValid} />
                </View>
                </View>
            </TouchableWithoutFeedback>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: "space-between",
    },
    body: {
        alignItems: "center",
        justifyContent: "center",
        flex: 1,
    },
    logo: {
        width: LOGO_SIZE,
        height: LOGO_SIZE,
        borderRadius: LOGO_SIZE / 2,
        alignItems: "center",
        justifyContent: "center",
    },
    form: {
        width: "100%",
    },
    footer: {
        width: "100%",
    },
});
