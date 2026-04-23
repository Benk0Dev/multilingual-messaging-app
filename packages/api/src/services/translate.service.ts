import { TranslationServiceClient } from "@google-cloud/translate";
import { requiredEnv } from "../utils/requiredEnv";

// import { TranslateClient, TranslateTextCommand } from "@aws-sdk/client-translate";

const projectId = requiredEnv("GOOGLE_CLOUD_PROJECT_ID");
const parent = `projects/${projectId}/locations/global`;
const llmModel = `${parent}/models/general/translation-llm`;

const googleClient = new TranslationServiceClient();

// Uses Google's Translation LLM model, which is purpose-built for conversational text
// Latency is ~2-3x Amazon Translate but quality on casual / idiomatic messages is significantly better
export async function translateText(
    text: string,
    sourceLang: string,
    targetLang: string,
): Promise<string> {
    const [response] = await googleClient.translateText({
        parent,
        model: llmModel,
        contents: [text],
        mimeType: "text/plain",
        sourceLanguageCode: sourceLang,
        targetLanguageCode: targetLang,
    });

    return response.translations?.[0]?.translatedText ?? "";
}

export async function translateTextAutodetect(
    text: string,
    targetLang: string,
): Promise<string> {
    const [response] = await googleClient.translateText({
        parent,
        model: llmModel,
        contents: [text],
        mimeType: "text/plain",
        targetLanguageCode: targetLang,
    });

    return response.translations?.[0]?.translatedText ?? "";
}

// --- Amazon Translate (kept for reference / rollback) ---
//
// const region = requiredEnv("AWS_REGION");
// const amazonClient = new TranslateClient({ region });
//
// export async function translateText(
//     text: string,
//     sourceLang: string,
//     targetLang: string,
// ): Promise<string> {
//     const response = await amazonClient.send(new TranslateTextCommand({
//         Text: text,
//         SourceLanguageCode: sourceLang,
//         TargetLanguageCode: targetLang,
//     }));
//     return response.TranslatedText!;
// }
//
// export async function translateTextAutodetect(
//     text: string,
//     targetLang: string,
// ): Promise<string> {
//     const response = await amazonClient.send(new TranslateTextCommand({
//         Text: text,
//         SourceLanguageCode: "auto",
//         TargetLanguageCode: targetLang,
//     }));
//     return response.TranslatedText!;
// }