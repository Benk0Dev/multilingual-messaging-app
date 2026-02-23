import { api } from "./client";
import { User } from "@app/shared-types/models";

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