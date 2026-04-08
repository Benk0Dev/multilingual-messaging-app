import { create } from "zustand";
import type { User } from "@app/shared-types/models";

type UserStore = {
    me: User | null;
    setMe: (user: User) => void;
    clear: () => void;
};

export const useUserStore = create<UserStore>((set) => ({
    me: null,
    setMe: (user) => set({ me: user }),
    clear: () => set({ me: null }),
}));