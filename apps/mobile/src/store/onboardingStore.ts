import { create } from "zustand";
import type { LanguageCode } from "@app/shared-types/enums";

type OnboardingStore = {
    preferredLang: LanguageCode | null;
    username: string | null;
    displayName: string | null;
    pictureLocalUri: string | null; // device-local file URI before upload
    pictureUrl: string | null; // public S3 URL after upload
    setPreferredLang: (lang: LanguageCode) => void;
    setUsername: (username: string) => void;
    setDisplayName: (displayName: string) => void;
    setPictureLocalUri: (uri: string | null) => void;
    setPictureUrl: (url: string | null) => void;
    reset: () => void;
};

// Holds onboarding data client-side until the user finishes the final step
export const useOnboardingStore = create<OnboardingStore>((set) => ({
    preferredLang: null,
    username: null,
    displayName: null,
    pictureLocalUri: null,
    pictureUrl: null,
    setPreferredLang: (preferredLang) => set({ preferredLang }),
    setUsername: (username) => set({ username }),
    setDisplayName: (displayName) => set({ displayName }),
    setPictureLocalUri: (pictureLocalUri) => set({ pictureLocalUri }),
    setPictureUrl: (pictureUrl) => set({ pictureUrl }),
    reset: () =>
        set({
            preferredLang: null,
            username: null,
            displayName: null,
            pictureLocalUri: null,
            pictureUrl: null,
        }),
}));