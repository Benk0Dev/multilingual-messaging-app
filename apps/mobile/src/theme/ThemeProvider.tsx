import React, { createContext, useContext, useMemo } from 'react';
import { useColorScheme } from 'react-native';
import { lightTheme, darkTheme, type AppTheme } from './theme';

const ThemeContext = createContext<AppTheme>(lightTheme);

interface ThemeProviderProps {
    children: React.ReactNode;
    forcedTheme?: 'light' | 'dark'; // for testing/override
}

export function ThemeProvider({ children, forcedTheme }: ThemeProviderProps) {
    const systemScheme = useColorScheme();

    const theme = useMemo(() => {
        const scheme = forcedTheme ?? systemScheme ?? 'light';
        return scheme === 'dark' ? darkTheme : lightTheme;
    }, [forcedTheme, systemScheme]);

    return (
        <ThemeContext.Provider value={theme}>
            {children}
        </ThemeContext.Provider>
    );
}

export function useTheme(): AppTheme {
    return useContext(ThemeContext);
}
