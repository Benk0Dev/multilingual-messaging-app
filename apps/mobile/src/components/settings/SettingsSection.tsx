import React, { Children, isValidElement, Fragment } from "react";
import { View, StyleSheet } from "react-native";
import { useTheme } from "@/src/theme";
import { Text } from "@/src/components/ui/Text";
import { Divider } from "@/src/components/ui/Divider";

interface SettingsSectionProps {
    title?: string;
    children: React.ReactNode;
}

export function SettingsSection({ title, children }: SettingsSectionProps) {
    const { colors, spacing, radii } = useTheme();
    const validChildren = Children.toArray(children).filter((c) => isValidElement(c));

    return (
        <View style={{ marginTop: spacing.lg, paddingHorizontal: spacing.lg }}>
            {title && (
                <Text
                    variant="caption"
                    color={colors.textSecondary}
                    style={{
                        paddingHorizontal: spacing.md,
                        marginBottom: spacing.xs,
                        textTransform: "uppercase",
                        letterSpacing: 0.5,
                    }}
                >
                    {title}
                </Text>
            )}
            <View style={{ backgroundColor: colors.card, borderColor: colors.border, borderRadius: radii.card }}>
                {validChildren.map((child, i) => (
                    <Fragment key={i}>
                        {child}
                        {i < validChildren.length - 1 && <Divider indent={spacing.lg + 32} />}
                    </Fragment>
                ))}
            </View>
        </View>
    );
}