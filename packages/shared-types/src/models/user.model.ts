export type User = {
    id: string;
    username: string;
    displayName: string;
    preferredLang: string;
    createdAt: string;
};

export type UserLite = {
    id: string;
    username: string;
    displayName: string;
};