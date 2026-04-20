import { api } from "./client";
import { User, SearchUsersResult } from "@app/shared-types/models";

export async function createUser(params: {
    username: string;
    displayName: string;
    preferredLang: string;
    pictureUrl?: string;
}) {
    return api<{ user: User }>(`/api/users`, {
        method: "POST",
        body: JSON.stringify({
            username: params.username,
            displayName: params.displayName,
            preferredLang: params.preferredLang,
            pictureUrl: params.pictureUrl,
        }),
    });
}

export async function getMe() {
    return api<{ user: User | null }>(`/api/users/me`, {
        method: "GET",
    });
}

export async function updateMe(params: {
    username?: string;
    displayName?: string;
    preferredLang?: string;
    pictureUrl?: string | null;
}) {
    return api<{ user: User }>(`/api/users/me`, {
        method: "PATCH",
        body: JSON.stringify(params),
    });
}

export async function checkUsernameAvailable(username: string) {
    const query = new URLSearchParams({ username });
    return api<{ available: boolean }>(`/api/users/username-available?${query.toString()}`, {
        method: "GET",
    });
}
 
export async function getProfilePictureUploadUrl(extension: "jpg" | "jpeg" | "png" | "webp") {
    const query = new URLSearchParams({ extension });
    return api<{ uploadUrl: string; publicUrl: string; expiresIn: number }>(
        `/api/users/picture-upload-url?${query.toString()}`,
        { method: "GET" }
    );
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