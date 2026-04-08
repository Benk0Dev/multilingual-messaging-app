import React from 'react';
import { View } from 'react-native';
import { useTheme } from '../../theme';

interface DividerProps {
    indent?: number;
}

export function Divider({ indent = 0 }: DividerProps) {
    const { colors } = useTheme();

    return (
        <View
            style={{
                height: 0.5,
                backgroundColor: colors.divider,
                marginLeft: indent,
            }}
        />
    );
}
