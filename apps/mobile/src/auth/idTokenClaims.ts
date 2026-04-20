import * as SecureStore from "expo-secure-store";
import { TOKEN_KEY } from "../constants/storage-keys";
import { StoredTokens } from "../types";

export async function getEmailFromIdToken(): Promise<string | null> {
    const raw = await SecureStore.getItemAsync(TOKEN_KEY);
    if (!raw) return null;

    let tokens: StoredTokens;
    try {
        tokens = JSON.parse(raw);
    } catch {
        return null;
    }

    if (!tokens.idToken) return null;

    return parseEmail(tokens.idToken);
}

function parseEmail(idToken: string): string | null {
    try {
        const parts = idToken.split(".");
        if (parts.length !== 3) return null;

        // base64url decode the payload
        const payload = parts[1].replace(/-/g, "+").replace(/_/g, "/");
        const padded = payload + "=".repeat((4 - (payload.length % 4)) % 4);
        const decoded = atob(padded);
        const claims = JSON.parse(decoded) as { email?: string };

        return typeof claims.email === "string" ? claims.email : null;
    } catch {
        return null;
    }
}
