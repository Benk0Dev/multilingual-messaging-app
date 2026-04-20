import React, { createContext, useContext, useEffect, useMemo } from 'react';
import { useColorScheme } from 'react-native';
import { lightTheme, darkTheme, type AppTheme } from './theme';
import { useThemeStore } from '../store/themeStore';

const ThemeContext = createContext<AppTheme>(lightTheme);

interface ThemeProviderProps {
    children: React.ReactNode;
    forcedTheme?: 'light' | 'dark'; // for testing/override
}

export function ThemeProvider({ children, forcedTheme }: ThemeProviderProps) {
    const systemScheme = useColorScheme();
    const mode = useThemeStore((s) => s.mode);
    const hydrate = useThemeStore((s) => s.hydrate);

    useEffect(() => {
        hydrate();
    }, [hydrate]);

    const theme = useMemo(() => {
        if (forcedTheme) {
            return forcedTheme === 'dark' ? darkTheme : lightTheme;
        }
        const effective = mode === 'system' ? (systemScheme ?? 'light') : mode;
        return effective === 'dark' ? darkTheme : lightTheme;
    }, [forcedTheme, mode, systemScheme]);

    return (
        <ThemeContext.Provider value={theme}>
            {children}
        </ThemeContext.Provider>
    );
}

export function useTheme(): AppTheme {
    return useContext(ThemeContext);
}
