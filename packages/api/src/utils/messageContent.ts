import { MessageContent } from "@app/shared-types/models";
import { decrypt } from "../services/crypto.service";

export function decryptContent(content: {
    id: string;
    textCipher: Uint8Array;
    textNonce: Uint8Array;
    originalLang: string;
    translations: {
        targetLang: string;
        translatedTextCipher: Uint8Array;
        translatedTextNonce: Uint8Array;
    }[];
}): MessageContent {
    const text = decrypt(content.textCipher, content.textNonce);
    const translation = content.translations[0];
    const translatedText = translation
        ? decrypt(translation.translatedTextCipher, translation.translatedTextNonce)
        : null;

    return {
        id: content.id.toString(),
        text,
        originalLang: content.originalLang,
        translation: translation && translatedText
            ? { targetLang: translation.targetLang, translatedText }
            : undefined,
    };
}