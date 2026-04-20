import { useEffect, useRef, useState } from "react";
import { View, StyleSheet, Platform, Pressable } from "react-native";
import { KeyboardAvoidingView } from "react-native-keyboard-controller";
import { useLocalSearchParams } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "@/src/theme";
import { Text } from "@/src/components/ui/Text";
import { OtpInput, type OtpInputRef } from "@/src/components/onboarding/OtpInput";
import { finishSignIn, startSignIn } from "@/src/auth/authService";
import { Header } from "@/src/components/onboarding/Header";

const CODE_LENGTH = 8;
const RESEND_COOLDOWN_SECONDS = 60;

export default function VerifyScreen() {
    const { colors, spacing } = useTheme();
    const insets = useSafeAreaInsets();
    const params = useLocalSearchParams<{ email: string; session?: string }>();
    const email = params.email ?? "";

    const [session, setSession] = useState<string | null>(params.session ?? null);
    const [code, setCode] = useState("");
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [resendCooldown, setResendCooldown] = useState(RESEND_COOLDOWN_SECONDS);
    const [resending, setResending] = useState(false);
    const otpRef = useRef<OtpInputRef>(null);

    // Start OTP request if we didn't arrive with a session
    useEffect(() => {
        if (session || !email) return;
        (async () => {
            try {
                const res = await startSignIn({ email });
                if (!res.session) throw new Error("Missing session from Cognito");
                setSession(res.session);
            } catch (e) {
                console.error(e);
                setError("Couldn't send the code - please go back and try again");
            }
        })();
    }, [email, session]);

    useEffect(() => {
        if (resendCooldown <= 0) return;
        const timer = setInterval(() => setResendCooldown((s) => Math.max(0, s - 1)), 1000);
        return () => clearInterval(timer);
    }, [resendCooldown]);

    function refocusInput() {
        requestAnimationFrame(() => {
            otpRef.current?.focus();
        });
    }

    async function onSubmit(codeToSubmit: string) {
        if (codeToSubmit.length !== CODE_LENGTH || submitting) return;
        if (!session) {
            setError("Still sending code - try again in a moment");
            return;
        }

        setSubmitting(true);
        setError(null);

        const result = await finishSignIn({ email, session, code: codeToSubmit });

        setSubmitting(false);

        if (result.ok) {
            // Root layout detects the bootstrap completion and redirects
            return;
        }

        if (result.nextSession) {
            setSession(result.nextSession);
        } else {
            setSession(null);
        }

        setCode("");
        refocusInput();

        if (result.reason === "expired") {
            setError("That code has expired - tap resend for a new one");
        } else if (result.reason === "wrong_code") {
            setError("The code you entered is incorrect - please try again");
        } else {
            setError("Something went wrong - please try again");
        }
    }

    function onChangeCode(next: string) {
        setCode(next);
        if (error) setError(null);
        if (next.length === CODE_LENGTH) {
            onSubmit(next);
        }
    }

    async function onResend() {
        if (resendCooldown > 0 || resending) return;
        setResending(true);
        setError(null);
        try {
            const res = await startSignIn({ email });
            if (!res.session) throw new Error("Missing session");
            setSession(res.session);
            setCode("");
            setResendCooldown(RESEND_COOLDOWN_SECONDS);
            refocusInput();
        } catch (e) {
            console.error(e);
            setError("Couldn't resend - please try again");
        } finally {
            setResending(false);
        }
    }

    return (
        <KeyboardAvoidingView
            style={{ flex: 1, backgroundColor: colors.bg }}
            behavior={Platform.OS === "ios" ? "padding" : "height"}
            keyboardVerticalOffset={-(insets.bottom)}
        >
            <View
                style={[
                    styles.container,
                    {
                        paddingTop: insets.top + spacing.sm,
                        paddingBottom: insets.bottom + spacing.lg,
                    },
                ]}
            >
                <Header
                    title="Verify your email"
                    subtitle=""
                    showBack={true}
                />

                <View 
                    style={[
                        styles.container,
                        { paddingHorizontal: spacing.lg },
                    ]}
                >
                    <Text
                        variant="secondary"
                        color={colors.textSecondary}
                        style={{ marginBottom: spacing.xl }}
                    >
                        Enter the 8-digit code sent to{" "}
                        <Text variant="bodyBold">{email}</Text>
                    </Text>

                    <OtpInput
                        ref={otpRef}
                        length={CODE_LENGTH}
                        value={code}
                        onChange={onChangeCode}
                        error={!!error}
                        disabled={submitting}
                    />

                    {error && (
                        <Text
                            variant="caption"
                            color={colors.error}
                            style={{ marginTop: spacing.md }}
                        >
                            {error}
                        </Text>
                    )}
                </View>

                <View style={styles.footer}>
                    <Pressable onPress={onResend} disabled={resendCooldown > 0 || resending}>
                        <Text variant="secondary" align="center" color={colors.textSecondary}>
                            Didn't receive the code?{" "}
                            <Text
                                variant="secondary"
                                color={resendCooldown > 0 ? colors.textTertiary : colors.primary}
                                style={{ fontWeight: "600" }}
                            >
                                {resendCooldown > 0 ? `Resend (${resendCooldown}s)` : "Resend"}
                            </Text>
                        </Text>
                    </Pressable>
                </View>
            </View>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    footer: {
        width: "100%",
    },
});