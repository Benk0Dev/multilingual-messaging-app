import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../theme';

export type ReceiptStatus = 'sent' | 'delivered' | 'read';

interface ReceiptIconProps {
    status: ReceiptStatus;
}

export function ReceiptIcon({ status }: ReceiptIconProps) {
    const { colors } = useTheme();

    const color = status === 'read' ? colors.receiptRead : colors.receiptDelivered;

    if (status === 'sent') {
        return <Ionicons name="checkmark-sharp" size={14} color={color} />;
    }

    // Double tick for delivered/read
    return (
        <View style={styles.double}>
            <Ionicons name="checkmark-sharp" size={14} color={color} style={styles.overlap} />
            <Ionicons name="checkmark-sharp" size={14} color={color} />
        </View>
    );
}

const styles = StyleSheet.create({
    double: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    overlap: {
        marginRight: -9,
    },
});
