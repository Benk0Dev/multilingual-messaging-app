import { prisma } from "@app/db";
import { Message } from "@app/shared-types/models";
import { sendToUser } from "./realtime.service";
import { translateText } from "./translate.service";

export async function createMessageForChat(input: {
    chatId: string,
    senderId: string,
    content: { 
        text: string;
    };
}): Promise<Message> {
    const membership = await prisma.chatMember.findUnique({
        where: {
            chatId_userId: {
                chatId: input.chatId,
                userId: input.senderId,
            },
        },
    });

    if (!membership) {
        throw new Error("membership_not_found");
    }

    const sender = await prisma.user.findUnique({
        where: { id: input.senderId },
        select: { preferredLang: true },
    });

    if (!sender) {
        throw new Error("sender_not_found");
    }

    const senderLang = sender.preferredLang;

    const recipientIds = (await prisma.chatMember.findMany({
        where: { chatId: input.chatId },
        select: { userId: true },
    })).filter((member) => member.userId !== input.senderId).map((member) => member.userId);

    const requiredTranslations = await prisma.user.findMany({
        where: {
            id: {
                in: recipientIds,
            },
            preferredLang: {
                not: senderLang,
            },
        },
        select: {
            id: true,
            preferredLang: true,
        },
    });

    const result = await prisma.$transaction(async (tx) => {
        const messageContent = await tx.messageContent.create({
            data: {
                text: input.content.text,
                originalLang: senderLang,
            },
            select: {
                id: true,
                text: true,
                originalLang: true,
            },
        });

        let translations: { recipientId: string; targetLang: string; translatedText: string }[] = [];

        if (requiredTranslations.length > 0) {
            translations = await Promise.all(requiredTranslations.map(async (translation) => {
                const translatedText = await translateText(input.content.text, senderLang, translation.preferredLang);
                return {
                    recipientId: translation.id,
                    targetLang: translation.preferredLang,
                    translatedText: translatedText,
                };
            }));
            await tx.messageTranslation.createMany({ data: translations.map((translation) => ({
                contentId: messageContent.id,
                targetLang: translation.targetLang,
                translatedText: translation.translatedText,
            })) });
        }

        const message = await tx.message.create({
            data: {
                chatId: input.chatId,
                senderId: input.senderId,
                contentId: messageContent.id,
            },
            select: {
                id: true,
                chat: {
                    select: {
                        id: true,
                    },
                },
                sender: {
                    select: {
                        id: true,
                        username: true,
                        displayName: true,
                    },
                },
                content: {
                    select: {
                        id: true,
                        text: true,
                        originalLang: true,
                    },
                },
                isDeleted: true,
                createdAt: true,
                updatedAt: true,
            },
        });

        return { 
            message: {
                ...message,
                id: message.id.toString(),
                chat: {
                    id: message.chat.id.toString(),
                },
                sender: {
                    ...message.sender,
                    id: message.sender.id.toString(),
                },
                content: {
                    ...message.content,
                    id: message.content.id.toString(),
                },
                createdAt: message.createdAt.toISOString(),
                updatedAt: message.updatedAt.toISOString(),
            },
            translations,
        };
    });

    try {
        await Promise.all(recipientIds.map((recipientId) => {
            const translation = result.translations.find((translation) => translation.recipientId === recipientId);

            const payload = {
                type: "message.created",
                message: {
                    ...result.message,
                    content: {
                        ...result.message.content,
                        translation: translation ? {
                            targetLang: translation.targetLang,
                            translatedText: translation.translatedText,
                        } : undefined,
                    }
                },
            };

            return sendToUser(recipientId, payload);
        }));
    } catch (error) {
        console.error("WebSocket fanout failed", error);
    }

    return result.message;
}

export async function getMessagesForChat(input: { userId: string, chatId: string }): Promise<{ messages: Message[] }> {
    const user = await prisma.user.findUnique({
        where: { id: input.userId },
        select: { preferredLang: true },
    });
    if (!user) {
        throw new Error("user_not_found");
    }

    const userLang = user.preferredLang;

    const membership = await prisma.chatMember.findUnique({
        where: {
            chatId_userId: {
                chatId: input.chatId,
                userId: input.userId,
            },
        },
    });
    if (!membership) {
        throw new Error("membership_not_found");
    }

    const messages = await prisma.message.findMany({
        where: { chatId: input.chatId },
        orderBy: { createdAt: "asc" },
        select: {
            id: true,
            chat: {
                select: {
                    id: true,
                },
            },
            sender: {
                select: {
                    id: true,
                    username: true,
                    displayName: true,
                },
            },
            content: {
                select: {
                    id: true,
                    text: true,
                    originalLang: true,
                    translations: {
                        where: {
                            targetLang: userLang,
                        },
                        select: {
                            targetLang: true,
                            translatedText: true,
                        },
                    },
                },
            },
            isDeleted: true,
            createdAt: true,
            updatedAt: true,
        },
    });

    return {
        messages: messages.map((message) => ({
            ...message,
            id: message.id.toString(),
            chat: {
                id: message.chat.id.toString(),
            },
            sender: {
                ...message.sender,
                id: message.sender.id.toString(),
            },
            content: {
                ...message.content,
                id: message.content.id.toString(),
                translation: message.content.translations.length > 0 ? {
                    targetLang: message.content.translations[0]!.targetLang,
                    translatedText: message.content.translations[0]!.translatedText,
                } : undefined,
            },
            createdAt: message.createdAt.toISOString(),
            updatedAt: message.updatedAt.toISOString(),
        })),
    }
}