import type { User, MessageContent, MessageReceipt } from "./index.ts";

export type Message = {
    id: string;
    chatId: string;
    sender: User;
    content: MessageContent;
    receipts?: MessageReceipt[];
    isDeleted: boolean;
    createdAt: string;
    updatedAt: string;
}

export type LastMessage = {
    id: string;
    content: MessageContent;
    sender: User;
    isDeleted: boolean;
    createdAt: string;
    updatedAt: string;
}