import { api } from "./client";
import { Message } from "@app/shared-types/models";

export async function getMessagesForChat(params: {
    chatId: string;
    limit?: number;
}): Promise<Message[]> {
    const query = new URLSearchParams();
    if (params.limit) {
        query.set("limit", params.limit.toString());
    }
    const url = `/api/chats/${params.chatId}/messages?${query.toString()}`;
    const data = await api<{ messages: Message[] }>(url, {
        method: "GET",
    });
    return data.messages;
}

export async function createMessageForChat(params: {
    chatId: string;
    content: {
        text: string;
    };
}) {
    const data = await api<{ message: Message }>(`/api/chats/${params.chatId}/messages`, {
        method: "POST",
        body: JSON.stringify({
            content: params.content,
        }),
    });
    return data.message;
}

export async function markMessagesAsDelivered(params: {
    messageIds: string[];
}) {
    await api(`/api/messages/delivered`, {
        method: "POST",
        body: JSON.stringify({ messageIds: params.messageIds }),
    });
}

export async function markMessagesAsRead(params: {
    messageIds: string[];
}) {
    await api(`/api/messages/read`, {
        method: "POST",
        body: JSON.stringify({ messageIds: params.messageIds }),
    });
}