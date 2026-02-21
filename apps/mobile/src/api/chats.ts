import { api } from "./client";
import { Chat } from "@app/shared-types/models";

export async function getChatsForUser(userId: string): Promise<Chat[]> {
    const data = await api<{ chats: Chat[] }>(`/api/users/${userId}/chats`);
    return data.chats;
}