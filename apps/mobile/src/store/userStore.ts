import { create } from "zustand";
import type { User } from "@app/shared-types/models";

type UserStore = {
    me: User | null;
    checked: boolean; // true once getMe has resolved 
    setMe: (user: User | null) => void;
    setChecked: (checked: boolean) => void;
    clear: () => void;
};

export const useUserStore = create<UserStore>((set) => ({
    me: null,
    checked: false,
    setMe: (user) => set({ me: user }),
    setChecked: (checked) => set({ checked }),
    clear: () => set({ me: null, checked: false }),
}));