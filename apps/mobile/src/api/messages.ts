import { api } from "./client";

export type Message = {
    id: string;
    senderId: string;
    isDeleted: boolean;
    createdAt: string;
    updatedAt: string;
    sender: { 
        id: string;
        displayName: string
    };
    content: { 
        id: string;
        textBody: string;
        originalLanguage: string;
    };
};

export async function getMessagesForChat(chatId: string): Promise<Message[]> {
    const data = await api<Message[]>(`/api/chats/${chatId}/messages`); // later will include limit
    return data;
}

// text for now, but will be content with additional attributes
export async function sendMessage(chatId: string, senderId: string, text: string) {
    return api(`/api/chats/${chatId}/messages`, {
        method: "POST",
        body: JSON.stringify({ senderId, content: { textBody: text } }),
    });
}