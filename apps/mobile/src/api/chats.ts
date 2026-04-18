import { api } from "./client";
import { Chat, Message } from "@app/shared-types/models";

export async function getChats(): Promise<Chat[]> {
    const data = await api<{ chats: Chat[] }>(`/api/chats`, {
        method: "GET",
    });
    return data.chats;
}

export async function createChatAndSendFirstMessage(params: {
    userIds: string[];
    content: {
        text: string;
    };
    clientId?: string;
}): Promise<{ chat: Chat, message: Message }> {
    const data = await api<{ chat: Chat, message: Message }>(`/api/chats`, {
        method: "POST",
        body: JSON.stringify({
            userIds: params.userIds,
            content: params.content,
            ...(params.clientId ? { clientId: params.clientId } : {}),
        }),
    });
    return data;
}