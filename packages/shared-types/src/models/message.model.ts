import type { UserLite, ChatLite, MessageContent } from "./index.ts";

export type Message = {
    id: string;
    chat: ChatLite;
    sender: UserLite;
    content: MessageContent;
    isDeleted: boolean;
    createdAt: string;
    updatedAt: string;
}