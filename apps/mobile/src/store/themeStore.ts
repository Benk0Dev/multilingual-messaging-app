import { create } from "zustand";
import AsyncStorage from "@react-native-async-storage/async-storage";

export type ThemeMode = "system" | "light" | "dark";

const STORAGE_KEY = "theme.mode";

type ThemeStore = {
    mode: ThemeMode;
    hydrated: boolean; // true once the saved mode has been read from AsyncStorage
    setMode: (mode: ThemeMode) => Promise<void>;
    hydrate: () => Promise<void>;
};

export const useThemeStore = create<ThemeStore>((set, get) => ({
    mode: "system",
    hydrated: false,

    setMode: async (mode) => {
        set({ mode });
        try {
            await AsyncStorage.setItem(STORAGE_KEY, mode);
        } catch (e) {
            console.warn("Failed to persist theme mode", e);
        }
    },

    hydrate: async () => {
        if (get().hydrated) return;

        try {
            const saved = await AsyncStorage.getItem(STORAGE_KEY);
            if (saved === "light" || saved === "dark" || saved === "system") {
                set({ mode: saved, hydrated: true });
                return;
            }
        } catch (e) {
            console.warn("Failed to read theme mode", e);
        }
        set({ hydrated: true });
    },
}));
