export type SearchUsersResult = {
    id: string;
    username: string;
    displayName: string;
    pictureUrl: string | null;
    chatId?: string;
}