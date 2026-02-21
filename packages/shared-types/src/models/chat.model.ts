import type { UserLite } from "./index.ts";

export type Chat = {
    id: string;
    createdAt: string;
    members: UserLite[];
};

export type ChatLite = {
    id: string;
};