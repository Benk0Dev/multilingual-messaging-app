import { api } from "./client";
import { Chat } from "@app/shared-types/models";

export async function getChats(): Promise<Chat[]> {
    const data = await api<{ chats: Chat[] }>(`/api/users/me/chats`);
    return data.chats;
}