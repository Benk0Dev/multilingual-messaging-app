import {
    CognitoIdentityProviderClient,
    InitiateAuthCommand,
    RespondToAuthChallengeCommand,
    SignUpCommand,
} from "@aws-sdk/client-cognito-identity-provider";
import * as SecureStore from "expo-secure-store";
import { v4 as uuidv4 } from "uuid";
import { COGNITO_REGION, COGNITO_USER_POOL_CLIENT_ID } from "../config";
import { TOKEN_KEY } from "../constants/storage-keys";
import { StoredTokens } from "../types";

const client = new CognitoIdentityProviderClient({ region: COGNITO_REGION });

function generateThrowawayPassword() {
    const random = uuidv4();
    return `Aa1!${random}`;
}
 
// Caller should treat UsernameExistsException as "already registered, proceed to OTP".
export async function signUp(email: string) {
    const password = generateThrowawayPassword();
 
    await client.send(
        new SignUpCommand({
            ClientId: COGNITO_USER_POOL_CLIENT_ID,
            Username: email,
            Password: password,
            UserAttributes: [
                { Name: "email", Value: email },
            ],
        })
    );
}

export async function startEmailOtp(email: string) {
    const res = await client.send(
        new InitiateAuthCommand({
            ClientId: COGNITO_USER_POOL_CLIENT_ID,
            AuthFlow: "USER_AUTH",
            AuthParameters: {
                USERNAME: email,
                PREFERRED_CHALLENGE: "EMAIL_OTP",
            },
        })
    );

    return {
        session: res.Session,
    };
}

export type VerifyOtpResult =
    | { ok: true }
    | { ok: false; reason: "wrong_code" | "expired" | "unknown"; nextSession: string | null };

export async function verifyEmailOtp(
    email: string,
    session: string,
    code: string
): Promise<VerifyOtpResult> {
    try {
        const res = await client.send(
            new RespondToAuthChallengeCommand({
                ClientId: COGNITO_USER_POOL_CLIENT_ID,
                ChallengeName: "EMAIL_OTP",
                Session: session,
                ChallengeResponses: {
                    USERNAME: email,
                    EMAIL_OTP_CODE: code,
                },
            })
        );

        const result = res.AuthenticationResult;

        if (!result) {
            return {
                ok: false,
                reason: "wrong_code",
                nextSession: res.Session ?? null,
            };
        }

        await SecureStore.setItemAsync(
            TOKEN_KEY,
            JSON.stringify({
                accessToken: result.AccessToken!,
                idToken: result.IdToken!,
                refreshToken: result.RefreshToken!,
                expiresAt: Date.now() + result.ExpiresIn! * 1000,
            } satisfies StoredTokens)
        );

        return { ok: true };
    } catch (e: any) {
        const nextSession: string | null =
            e?.$response?.body?.Session ??
            e?.Session ??
            null;

        const name = e?.name;
        if (name === "CodeMismatchException" || name === "NotAuthorizedException") {
            return { ok: false, reason: "wrong_code", nextSession };
        }
        if (name === "ExpiredCodeException") {
            return { ok: false, reason: "expired", nextSession };
        }

        console.error("verifyEmailOtp unexpected error", e);
        return { ok: false, reason: "unknown", nextSession };
    }
}

export async function refreshAuthSession(refreshToken: string) {
    const res = await client.send(
        new InitiateAuthCommand({
            ClientId: COGNITO_USER_POOL_CLIENT_ID,
            AuthFlow: "REFRESH_TOKEN_AUTH",
            AuthParameters: {
                REFRESH_TOKEN: refreshToken,
            },
        })
    );

    const result = res.AuthenticationResult;
    if (!result?.AccessToken || !result?.IdToken || !result?.ExpiresIn) {
        throw new Error("No refresh auth result");
    }

    return {
        accessToken: result.AccessToken,
        idToken: result.IdToken,
        expiresIn: result.ExpiresIn,
    };
}