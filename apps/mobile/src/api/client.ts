import * as SecureStore from "expo-secure-store";
import { BASE_URL } from "../config"; // Temporary
import { TOKEN_KEY } from "../constants/storage-keys";
import { StoredTokens } from "../types";

async function getAccessToken(): Promise<string | null> {
    const raw = await SecureStore.getItemAsync(TOKEN_KEY);
    if (!raw) return null;
  
    try {
        const parsed: StoredTokens = JSON.parse(raw);
        return parsed.accessToken ?? null;
    } catch {
        return null;
    }
}

export async function api<T>(path: string, init?: RequestInit): Promise<T> {
    const token = await getAccessToken();

    const res = await fetch(`${BASE_URL}${path}`, {
        ...init,
        headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
            ...(init?.headers ?? {}),
        },
    });

    if (!res.ok) {
        const text = await res.text();
        throw new Error(`${res.status} ${res.statusText}: ${text}`);
    }

    return res.json() as Promise<T>;
}