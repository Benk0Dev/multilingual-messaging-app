import { useEffect, useRef, useState } from "react";
import { View, StyleSheet } from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { usernameSchema } from "@app/shared-types/schemas";
import { useTheme } from "@/src/theme";
import { Text } from "@/src/components/ui/Text";
import { Button } from "@/src/components/ui/Button";
import { ProgressBar } from "@/src/components/onboarding/ProgressBar";
import { OnboardingScreen } from "@/src/components/onboarding/OnboardingScreen";
import { TextInputField } from "@/src/components/ui/TextInputField";
import { useOnboardingStore } from "@/src/store/onboardingStore";
import { checkUsernameAvailable } from "@/src/api/users";
import { Header } from "@/src/components/onboarding/Header";

const AVAILABILITY_DEBOUNCE_MS = 400;

type AvailabilityState =
    | { status: "idle" }
    | { status: "checking" }
    | { status: "available" }
    | { status: "taken" }
    | { status: "invalid"; message: string }
    | { status: "error" };

export default function UsernameStep() {
    const { colors, spacing } = useTheme();
    const savedUsername = useOnboardingStore((s) => s.username);
    const setUsername = useOnboardingStore((s) => s.setUsername);
    const [value, setValue] = useState(savedUsername ?? "");
    const [availability, setAvailability] = useState<AvailabilityState>({ status: "idle" });
    const requestIdRef = useRef(0);

    useEffect(() => {
        const trimmed = value.trim();

        if (trimmed.length === 0) {
            setAvailability({ status: "idle" });
            return;
        }

        const parsed = usernameSchema.safeParse(trimmed);
        if (!parsed.success) {
            setAvailability({
                status: "invalid",
                message: "4 to 15 characters, letters, numbers and underscores only",
            });
            return;
        }

        setAvailability({ status: "checking" });
        const myRequestId = ++requestIdRef.current;

        const handle = setTimeout(async () => {
            try {
                const { available } = await checkUsernameAvailable(trimmed);
                if (myRequestId !== requestIdRef.current) return;
                setAvailability({ status: available ? "available" : "taken" });
            } catch (e) {
                if (myRequestId !== requestIdRef.current) return;
                console.error(e);
                setAvailability({ status: "error" });
            }
        }, AVAILABILITY_DEBOUNCE_MS);

        return () => clearTimeout(handle);
    }, [value]);

    const canContinue = availability.status === "available";

    function onNext() {
        if (!canContinue) return;
        setUsername(value.trim());
        router.push("/(auth)/onboarding/name");
    }

    const isErrorState =
        availability.status === "taken" ||
        availability.status === "invalid" ||
        availability.status === "error";

    return (
        <OnboardingScreen>
            <ProgressBar step={2} totalSteps={4} />

            <Header
                title="Pick a username"
                subtitle="This will be your unique identifier"
                showBack={true}
            />

            <View style={[styles.content, { paddingHorizontal: spacing.lg, marginTop: spacing.xs }]}>
                <TextInputField
                    value={value}
                    onChangeText={setValue}
                    placeholder="username"
                    autoCapitalize="none"
                    autoCorrect={false}
                    autoFocus
                    maxLength={15}
                    returnKeyType="next"
                    onSubmitEditing={onNext}
                    error={isErrorState}
                    success={availability.status === "available"}
                    leftAdornment={
                        <Text variant="body" color={colors.textTertiary} style={styles.at}>
                            @
                        </Text>
                    }
                    rightAdornment={<AvailabilityIcon availability={availability} colors={colors} />}
                />

                <View style={{ minHeight: 20, marginTop: spacing.sm }}>
                    <AvailabilityMessage availability={availability} colors={colors} />
                </View>

                <View style={{ flex: 1 }} />

                <Button label="Continue" onPress={onNext} disabled={!canContinue} />
            </View>
        </OnboardingScreen>
    );
}

function AvailabilityIcon({
    availability,
    colors,
}: {
    availability: AvailabilityState;
    colors: any;
}) {
    if (availability.status === "checking") {
        return <Ionicons name="ellipsis-horizontal" size={20} color={colors.textTertiary} />;
    }
    if (availability.status === "available") {
        return <Ionicons name="checkmark-circle" size={20} color={colors.secondary} />;
    }
    if (availability.status === "taken" || availability.status === "invalid") {
        return <Ionicons name="close-circle" size={20} color={colors.error} />;
    }
    return null;
}

function AvailabilityMessage({
    availability,
    colors,
}: {
    availability: AvailabilityState;
    colors: any;
}) {
    switch (availability.status) {
        case "available":
            return (
                <Text variant="caption" color={colors.secondary}>
                    The username is available
                </Text>
            );
        case "taken":
            return (
                <Text variant="caption" color={colors.error}>
                    That username is already taken
                </Text>
            );
        case "invalid":
            return (
                <Text variant="caption" color={colors.error}>
                    {availability.message}
                </Text>
            );
        case "error":
            return (
                <Text variant="caption" color={colors.error}>
                    Couldn't check availability - please try again
                </Text>
            );
        case "checking":
            return (
                <Text variant="caption" color={colors.textTertiary}>
                    Checking...
                </Text>
            );
        default:
            return null;
    }
}

const styles = StyleSheet.create({
    content: {
        flex: 1,
    },
    at: {
        fontSize: 16,
        fontWeight: "600",
    },
});