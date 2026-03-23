export type MessageContent = {
    id: string;
    text: string;
    originalLang: string;
    translation?: MessageTranslation;
};

export type MessageTranslation = {
    targetLang: string;
    translatedText: string;
};