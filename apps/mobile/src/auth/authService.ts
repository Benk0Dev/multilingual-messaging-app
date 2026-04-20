import { createUser, getMe } from "../api/users";
import { signUp, startEmailOtp, verifyEmailOtp } from "./cognito";
import { clearSession } from "./session";
import { LanguageCode } from "@app/shared-types/enums";
import { useChatStore } from "../store/chatStore";
import { useUserStore } from "../store/userStore";
import { useOnboardingStore } from "../store/onboardingStore";
import type { VerifyOtpResult } from "./cognito";
import { router } from "expo-router";

function isUserAlreadyExists(err: any): boolean {
    return err?.name === "UsernameExistsException";
}

export async function startSignIn(params: {
    email: string;
}) {
    // Try to register the email first - if it already exists, carry on to OTP
    try {
        await signUp(params.email);
    } catch (e: any) {
        if (!isUserAlreadyExists(e)) {
            console.error(e);
            throw new Error("Failed to start sign in");
        }
    }

    try {
        const res = await startEmailOtp(params.email);
        return res;
    } catch (e: any) {
        console.error(e);
        throw new Error("Failed to start sign in");
    }
}

export async function finishSignIn(params: {
    email: string;
    session: string;
    code: string;
}): Promise<VerifyOtpResult> {
    const result = await verifyEmailOtp(params.email, params.session, params.code);

    if (!result.ok) {
        return result;
    }

    try {
        await bootstrap();
        return { ok: true };
    } catch (e) {
        console.error("bootstrap after OTP failed", e);
        return { ok: false, reason: "unknown", nextSession: null };
    }
}

export async function bootstrap() {
    useUserStore.getState().setChecked(false);
    
    try {
        const { user } = await getMe();
        useUserStore.getState().setMe(user);
    } catch (e) {
        console.error("Bootstrap failed:", e);
        throw e;
    } finally {
        useUserStore.getState().setChecked(true);
    }
}

export async function completeOnboarding(params: {
    username: string;
    displayName: string;
    preferredLang: LanguageCode;
    pictureUrl?: string;
}) {
    try {
        const { user } = await createUser({
            username: params.username,
            displayName: params.displayName,
            preferredLang: params.preferredLang,
            pictureUrl: params.pictureUrl,
        });

        useUserStore.getState().setMe(user);
        useOnboardingStore.getState().reset();

        return user;
    } catch (e: any) {
        console.error(e);
        throw e;
    }
}

export async function logout() {
    if (router.canGoBack()) {
        router.dismissAll();
    }
    useChatStore.getState().clearAll();
    useUserStore.getState().clear();
    useUserStore.getState().setChecked(true);
    useOnboardingStore.getState().reset();
    await clearSession();
}