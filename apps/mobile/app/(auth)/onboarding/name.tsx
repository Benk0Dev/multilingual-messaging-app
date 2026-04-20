import { useState } from "react";
import { View, StyleSheet } from "react-native";
import { router } from "expo-router";
import { useTheme } from "@/src/theme";
import { Button } from "@/src/components/ui/Button";
import { ProgressBar } from "@/src/components/onboarding/ProgressBar";
import { OnboardingScreen } from "@/src/components/onboarding/OnboardingScreen";
import { TextInputField } from "@/src/components/ui/TextInputField";
import { useOnboardingStore } from "@/src/store/onboardingStore";
import { Header } from "@/src/components/onboarding/Header";

const MIN_LENGTH = 1;
const MAX_LENGTH = 255;

export default function NameStep() {
    const { spacing } = useTheme();
    const saved = useOnboardingStore((s) => s.displayName);
    const setDisplayName = useOnboardingStore((s) => s.setDisplayName);
    const [value, setValue] = useState(saved ?? "");

    const trimmed = value.trim();
    const isValid = trimmed.length >= MIN_LENGTH && trimmed.length <= MAX_LENGTH;

    function onNext() {
        if (!isValid) return;
        setDisplayName(trimmed);
        router.push("/(auth)/onboarding/picture");
    }

    return (
        <OnboardingScreen>
            <ProgressBar step={3} totalSteps={4} />

            <Header
                title="What's your name?"
                subtitle="This will be the name shown in chats and your profile"
                showBack={true}
            />

            <View style={[styles.content, { paddingHorizontal: spacing.lg, marginTop: spacing.xs }]}>
                <TextInputField
                    value={value}
                    onChangeText={setValue}
                    placeholder="Your name"
                    autoCapitalize="words"
                    autoCorrect={false}
                    autoFocus
                    maxLength={MAX_LENGTH}
                    returnKeyType="next"
                    onSubmitEditing={onNext}
                />

                <View style={{ flex: 1 }} />

                <Button label="Continue" onPress={onNext} disabled={!isValid} />
            </View>
        </OnboardingScreen>
    );
}

const styles = StyleSheet.create({
    content: {
        flex: 1,
    },
});