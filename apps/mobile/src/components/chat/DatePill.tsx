import React from 'react';
import { View, StyleSheet } from 'react-native';
import { useTheme } from '../../theme';
import { Text } from '../ui/Text';

interface DatePillProps {
    label: string;
}

export function DatePill({ label }: DatePillProps) {
    const { colors, radii } = useTheme();

    return (
        <View style={styles.wrapper}>
            <View
                style={[
                    styles.pill,
                    {
                        backgroundColor: colors.datePill,
                        borderRadius: radii.datePill,
                    },
                ]}
            >
                <Text variant="caption" color={colors.datePillText}>
                    {label}
                </Text>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    wrapper: {
        alignItems: 'center',
        marginTop: 16,
    },
    pill: {
        paddingHorizontal: 16,
        paddingVertical: 3,
    },
});
