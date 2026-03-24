import { api } from "./client";
import { Chat, Message } from "@app/shared-types/models";

export async function getChats(): Promise<Chat[]> {
    const data = await api<{ chats: Chat[] }>(`/api/users/me/chats`);
    return data.chats;
}

export async function createChatAndSendFirstMessage(userIds: string[], content: { text: string }): Promise<{ chat: Chat, message: Message }> {
    const data = await api<{ chat: Chat, message: Message }>(`/api/chats`, {
        method: "POST",
        body: JSON.stringify({ userIds, content }),
    });
    return data;
}