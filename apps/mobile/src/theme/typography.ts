import { TextStyle, Platform } from 'react-native';

const fontFamily = Platform.select({
    ios: 'System',
    android: 'Roboto',
    default: 'System',
});

export const typography = {
    screenTitle: {
        fontFamily,
        fontSize: 28,
        fontWeight: '700' as TextStyle['fontWeight'],
        lineHeight: 32,
    },
    sectionHeader: {
        fontFamily,
        fontSize: 17,
        fontWeight: '600' as TextStyle['fontWeight'],
        lineHeight: 24,
    },
    body: {
        fontFamily,
        fontSize: 15,
        fontWeight: '400' as TextStyle['fontWeight'],
        lineHeight: 22,
    },
    bodyBold: {
        fontFamily,
        fontSize: 15,
        fontWeight: '600' as TextStyle['fontWeight'],
        lineHeight: 22,
    },
    secondary: {
        fontFamily,
        fontSize: 13,
        fontWeight: '400' as TextStyle['fontWeight'],
        lineHeight: 18,
    },
    caption: {
        fontFamily,
        fontSize: 11,
        fontWeight: '500' as TextStyle['fontWeight'],
        lineHeight: 16,
    },
    input: {
        fontFamily,
        fontSize: 16, // 16px prevents iOS auto-zoom on focus
        fontWeight: '400' as TextStyle['fontWeight'],
        lineHeight: 22,
    },
    button: {
        fontFamily,
        fontSize: 16,
        fontWeight: '600' as TextStyle['fontWeight'],
        lineHeight: 22,
    },
    navLabel: {
        fontFamily,
        fontSize: 10,
        fontWeight: '500' as TextStyle['fontWeight'],
        lineHeight: 14,
    },
};

export type TypographyVariant = keyof typeof typography;
