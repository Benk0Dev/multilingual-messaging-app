import * as SecureStore from "expo-secure-store";
import { TOKEN_KEY } from "../constants/storage-keys";
import { StoredTokens } from "../types";

// TODO: create refresh token logic in the future

export async function getValidAccessToken(): Promise<string | null> {
    const raw = await SecureStore.getItemAsync(TOKEN_KEY);
    if (!raw) return null;
  
    try {
        const tokens: StoredTokens = JSON.parse(raw);
    
        if (Date.now() >= tokens.expiresAt) {
            return null;
        }
    
        return tokens.accessToken;
    } catch {
        return null;
    }
}

export async function hasSession(): Promise<boolean> {
    const token = await getValidAccessToken();
    return Boolean(token);
}

export async function clearSession(): Promise<void> {
    await SecureStore.deleteItemAsync(TOKEN_KEY);
}