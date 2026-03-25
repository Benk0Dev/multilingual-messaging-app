import type { LastMessage, UserLite } from "./index.ts";

export type Chat = {
    id: string;
    createdAt: string;
    members: UserLite[];
    lastMessage?: LastMessage;
};

export type ChatLite = {
    id: string;
};