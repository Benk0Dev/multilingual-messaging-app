import { api } from "./client";
import { Message } from "@app/shared-types/models";

export async function getMessagesForChat(chatId: string): Promise<Message[]> {
    const data = await api<{ messages: Message[] }>(`/api/chats/${chatId}/messages`); // later will include limit
    return data.messages;
}

// text for now, but will be content with additional attributes
export async function createMessageForChat(chatId: string, text: string) {
    const data = await api<{ message: Message }>(`/api/chats/${chatId}/messages`, {
        method: "POST",
        body: JSON.stringify({ content: { text: text } }),
    });
    return data.message;
}