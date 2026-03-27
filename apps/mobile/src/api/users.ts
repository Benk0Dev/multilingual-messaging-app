import { api } from "./client";
import { User, SearchUsersResult } from "@app/shared-types/models";

export async function createUser(params: {
    displayName: string;
    preferredLang: string;
}) {
    return api<{ user: User }>(`/api/users`, {
        method: "POST",
        body: JSON.stringify({
            displayName: params.displayName,
            preferredLang: params.preferredLang,
        }),
    });
}

export async function getMe() {
    return api<{ user: User }>(`/api/users/me`, {
        method: "GET",
    });
}

export async function searchUsers(params: {
    query: string;
    limit?: number;
}) {
    const query = new URLSearchParams();
    query.set("q", params.query);
    if (params.limit) {
        query.set("limit", params.limit.toString());
    }
    const url = `/api/users/search?${query.toString()}`;
    return api<{ users: SearchUsersResult[] }>(url, {
        method: "GET",
    });
}