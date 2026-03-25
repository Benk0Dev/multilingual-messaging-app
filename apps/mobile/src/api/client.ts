import { BASE_URL } from "../config"; // Temporary
import { clearSession, getValidAccessToken, refreshSession } from "../auth/session";


export async function api<T>(path: string, init?: RequestInit): Promise<T> {
    async function sendWithToken(token: string | null): Promise<Response> {
        return fetch(`${BASE_URL}${path}`, {
            ...init,
            headers: {
                "Content-Type": "application/json",
                ...(token ? { Authorization: `Bearer ${token}` } : {}),
                ...(init?.headers ?? {}),
            },
        });
    }

    let token = await getValidAccessToken();
    let res = await sendWithToken(token);

    if (res.status === 401) {
        token = await refreshSession();

        if (!token) {
            await clearSession();
            throw new Error("401 Unauthorized: session expired");
        }

        res = await sendWithToken(token);
    }

    if (!res.ok) {
        if (res.status === 401) {
            await clearSession();
        }
        const text = await res.text();
        throw new Error(`${res.status} ${res.statusText}: ${text}`);
    }

    return res.json() as Promise<T>;
}