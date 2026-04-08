import React from 'react';
import { Text as RNText, TextProps, TextStyle } from 'react-native';
import { useTheme, type TypographyVariant } from '../../theme';

interface ThemedTextProps extends TextProps {
  variant?: TypographyVariant;
  color?: string;  // override colour - pass theme.colors.XXX
  align?: TextStyle['textAlign'];
}

export function Text({
    variant = 'body',
    color,
    align,
    style,
    ...props
}: ThemedTextProps) {
    const theme = useTheme();

    return (
        <RNText
        style={[
            theme.typography[variant],
            { color: color ?? theme.colors.textPrimary },
            align ? { textAlign: align } : undefined,
            style,
        ]}
        {...props}
        />
    );
}
