import React from "react";
import { View, StyleSheet } from "react-native";
import { useTheme } from "@/src/theme";

interface ProgressBarProps {
    step: number;
    totalSteps: number;
}

export function ProgressBar({ step, totalSteps }: ProgressBarProps) {
    const { colors } = useTheme();
    const fraction = Math.max(0, Math.min(1, step / totalSteps));

    return (
        <View style={[styles.track, { backgroundColor: colors.border }]}>
            <View
                style={[
                    styles.fill,
                    {
                        backgroundColor: colors.primary,
                        width: `${fraction * 100}%`,
                    },
                ]}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    track: {
        height: 3,
        width: "100%",
        overflow: "hidden",
    },
    fill: {
        height: "100%",
    },
});
