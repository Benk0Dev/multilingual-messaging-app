import {
    CognitoIdentityProviderClient,
    SignUpCommand,
    InitiateAuthCommand,
    RespondToAuthChallengeCommand,
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

export async function signUp(identifier: string, email: string) {
    const password = generateThrowawayPassword();
  
    await client.send(
        new SignUpCommand({
            ClientId: COGNITO_USER_POOL_CLIENT_ID,
            Username: identifier,
            Password: password,
            UserAttributes: [
                { Name: "email", Value: email },
            ],
        })
    );
}

export async function startEmailOtp(identifier: string) {
    const res = await client.send(
        new InitiateAuthCommand({
            ClientId: COGNITO_USER_POOL_CLIENT_ID,
            AuthFlow: "USER_AUTH",
            AuthParameters: {
                USERNAME: identifier,
                PREFERRED_CHALLENGE: "EMAIL_OTP",
            },
        })
    );
  
    return {
        session: res.Session,
    };
}

export async function verifyEmailOtp(
    identifier: string,
    session: string,
    code: string
) {
    const res = await client.send(
        new RespondToAuthChallengeCommand({
            ClientId: COGNITO_USER_POOL_CLIENT_ID,
            ChallengeName: "EMAIL_OTP",
            Session: session,
            ChallengeResponses: {
                USERNAME: identifier,
                EMAIL_OTP_CODE: code,
            },
        })
    );
  
    const result = res.AuthenticationResult;
  
    if (!result) throw new Error("No auth result");
  
    await SecureStore.setItemAsync(
        TOKEN_KEY,
        JSON.stringify({
            accessToken: result.AccessToken!,
            idToken: result.IdToken!,
            refreshToken: result.RefreshToken!,
            expiresAt: Date.now() + result.ExpiresIn! * 1000,
        } satisfies StoredTokens)
    );
  
    return result;
}
