import * as SecureStore from "expo-secure-store";
import { TOKEN_KEY } from "../constants/storage-keys";
import { StoredTokens } from "../types";
import { refreshAuthSession } from "./cognito";

const EXPIRY_BUFFER_MS = 30_000;

async function getStoredTokens(): Promise<StoredTokens | null> {
    const raw = await SecureStore.getItemAsync(TOKEN_KEY);
    if (!raw) return null;

    try {
        const tokens: StoredTokens = JSON.parse(raw);
        return tokens;
    } catch {
        return null;
    }
}

async function setStoredTokens(tokens: StoredTokens): Promise<void> {
    await SecureStore.setItemAsync(TOKEN_KEY, JSON.stringify(tokens));
}

function isAccessTokenValid(tokens: StoredTokens): boolean {
    return Date.now() < tokens.expiresAt - EXPIRY_BUFFER_MS;
}

let refreshInFlight: Promise<string | null> | null = null;

export async function refreshSession(): Promise<string | null> {
    if (refreshInFlight) {
        return refreshInFlight;
    }

    refreshInFlight = (async () => {
        const tokens = await getStoredTokens();
        if (!tokens?.refreshToken) {
            await clearSession();
            return null;
        }

        try {
            const refreshed = await refreshAuthSession(tokens.refreshToken);
            const nextTokens: StoredTokens = {
                ...tokens,
                accessToken: refreshed.accessToken,
                idToken: refreshed.idToken,
                expiresAt: Date.now() + refreshed.expiresIn * 1000,
            };

            await setStoredTokens(nextTokens);
            return nextTokens.accessToken;
        } catch {
            await clearSession();
            return null;
        } finally {
            refreshInFlight = null;
        }
    })();

    return refreshInFlight;
}

export async function getValidAccessToken(): Promise<string | null> {
    const tokens = await getStoredTokens();
    if (!tokens) return null;

    if (isAccessTokenValid(tokens)) {
        return tokens.accessToken;
    }

    return refreshSession();
}

export async function hasSession(): Promise<boolean> {
    const raw = await SecureStore.getItemAsync(TOKEN_KEY);
    if (!raw) {
        return false;
    }

    try {
        const tokens: StoredTokens = JSON.parse(raw);
        return Boolean(tokens.refreshToken);
    } catch {
        return false;
    }
}

export async function clearSession(): Promise<void> {
    await SecureStore.deleteItemAsync(TOKEN_KEY);
}