import type { UserLite, ChatLite, MessageContent, MessageReceipt } from "./index.ts";

export type Message = {
    id: string;
    chat: ChatLite;
    sender: UserLite;
    content: MessageContent;
    receipts?: MessageReceipt[];
    isDeleted: boolean;
    createdAt: string;
    updatedAt: string;
}

export type LastMessage = {
    id: string;
    content: MessageContent;
    sender: UserLite;
    isDeleted: boolean;
    createdAt: string;
    updatedAt: string;
}