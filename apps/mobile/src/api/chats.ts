import { api } from "./client";

export type Chat = {
    id: string;
    createdAt: string;
};

export async function getChatsForUser(userId: string): Promise<Chat[]> {
    const data = await api<{ chats: Chat[] }>(`/api/users/${userId}/chats`);
    return data.chats;
}