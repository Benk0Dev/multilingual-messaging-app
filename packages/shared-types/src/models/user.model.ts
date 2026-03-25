export type User = {
    id: string;
    username: string;
    displayName: string;
    preferredLang: string;
    pictureUrl?: string | null;
    createdAt: string;
};

export type UserLite = {
    id: string;
    username: string;
    displayName: string;
    pictureUrl?: string | null;
};