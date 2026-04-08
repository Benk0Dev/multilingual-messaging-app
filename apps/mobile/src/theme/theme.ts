import { lightColors, darkColors, type ThemeColors } from './colors';
import { typography } from './typography';
import { spacing, radii, avatarSizes } from './spacing';

export type AppTheme = {
    colors: ThemeColors;
    typography: typeof typography;
    spacing: typeof spacing;
    radii: typeof radii;
    avatarSizes: typeof avatarSizes;
    isDark: boolean;
};

export const lightTheme: AppTheme = {
    colors: lightColors,
    typography,
    spacing,
    radii,
    avatarSizes,
    isDark: false,
};

export const darkTheme: AppTheme = {
    colors: darkColors,
    typography,
    spacing,
    radii,
    avatarSizes,
    isDark: true,
};

