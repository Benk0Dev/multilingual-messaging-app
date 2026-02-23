import { createUser, getMe } from "../api/users";
import {
    signUp as signUpCognito,
    startEmailOtp,
    verifyEmailOtp,
} from "./cognito";
import { clearSession } from "./session";
import { usernameSchema, newUserDetailsSchema } from "@app/shared-types/schemas";
import { Language } from "@app/shared-types/enums";

function isEmailExistsError(err: any) {
    return err?.name === "EmailExistsException";
}

function isUserExistsError(err: any) {
    return err?.name === "UsernameExistsException";
}

export async function signUp(params: {
    email: string;
    username: string;
}) {
    try {
        const validatedUsername = usernameSchema.safeParse(params.username);

        if (!validatedUsername.success || !validatedUsername.data) {
            throw new Error("Username is invalid");
        }
        
        await signUpCognito(validatedUsername.data, params.email);
    } catch (e: any) {
        if (isEmailExistsError(e)) {
            throw new Error("Email already exists");
        } else if (isUserExistsError(e)) {
            throw new Error("Username already exists");
        } else {
            console.error(e);
            throw new Error("Failed to sign up");
        }
    }
}

export async function startSignIn(params: {
    identifier: string; // email or username
}) {
    try {
        const res = await startEmailOtp(params.identifier);
        return res;
    } catch (e: any) {
        throw new Error("Failed to start sign in");
    }
}

export async function finishSignIn(params: {
    identifier: string;
    session: string;
    code: string;
}) {
    try {
        await verifyEmailOtp(params.identifier, params.session, params.code);
        const user = await getMe();
        return user;
    } catch (e: any) {
        throw new Error("Failed to finish sign in");
    }
}

export async function finishFirstSignIn(params: {
    identifier: string;
    session: string;
    code: string;
    displayName: string;
    preferredLang: Language;
}) {
    try {
        const validatedNewUserDetails = newUserDetailsSchema.safeParse({
            displayName: params.displayName,
            preferredLang: params.preferredLang,
        });

        if (!validatedNewUserDetails.success || !validatedNewUserDetails.data) {
            throw new Error("User details are invalid");
        }

        await verifyEmailOtp(params.identifier, params.session, params.code);
        const user = await createUser(validatedNewUserDetails.data.displayName, validatedNewUserDetails.data.preferredLang);
        return user;
    } catch (e: any) {
        throw new Error("Failed to finish first sign in");
    }
}

export async function logout() {
    await clearSession();
}