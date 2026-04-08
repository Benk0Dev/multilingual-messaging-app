import type { LastMessage, User } from "./index.ts";

export type Chat = {
    id: string;
    createdAt: string;
    members: User[];
    lastMessage?: LastMessage;
};