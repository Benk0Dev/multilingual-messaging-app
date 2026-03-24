import { TranslateClient, TranslateTextCommand } from "@aws-sdk/client-translate";
import { requiredEnv } from "../utils/requiredEnv";

const region = requiredEnv("AWS_REGION");

const client = new TranslateClient({ region });

export async function translateText(
    text: string,
    sourceLang: string,
    targetLang: string
) {
    const command = new TranslateTextCommand({
        Text: text,
        SourceLanguageCode: sourceLang,
        TargetLanguageCode: targetLang,
    });

    const response = await client.send(command);

    return response.TranslatedText!;
}

// Will use for retry functionality in the future
export async function translateTextAutodetect(
    text: string,
    targetLang: string
) {
    const command = new TranslateTextCommand({
        Text: text,
        SourceLanguageCode: "auto",
        TargetLanguageCode: targetLang,
    });

    const response = await client.send(command);

    return response.TranslatedText!;
}