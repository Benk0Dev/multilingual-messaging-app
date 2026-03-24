import { api } from "./client";
import { User, SearchUsersResult } from "@app/shared-types/models";

export async function createUser(displayName: string, preferredLang: string) {
    return api<{ user: User }>(`/api/users`, {
        method: "POST",
        body: JSON.stringify({ displayName, preferredLang }),
    });
}

export async function getMe() {
    return api<{ user: User }>(`/api/users/me`, {
        method: "GET",
    });
}

export async function searchUsers(query: string) {
    return api<{ users: SearchUsersResult[] }>(`/api/users/search?q=${encodeURIComponent(query)}`, {
            method: "GET",
        },
    );
}