import { prisma } from "@app/db";
import { Message, MessageReceiptUpdate } from "@app/shared-types/models";
import { sendToUser } from "./realtime.service";
import { translateText } from "./translate.service";

export async function createMessageForChat(input: {
    chatId: string,
    senderId: string,
    content: { 
        text: string;
    };
}): Promise<Message> {
    if (input.content.text.trim() === "") {
        throw new Error("content_empty");
    }

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
    }

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
                        preferredLang: true,
                        createdAt: true,
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

        if (translations.length > 0) {
            await tx.messageTranslation.createMany({ 
                data: translations.map((translation) => ({
                    contentId: messageContent.id,
                    targetLang: translation.targetLang,
                    translatedText: translation.translatedText,
                })),
            });
        }

        await tx.messageReceipt.createMany({
            data: recipientIds.map((recipientId) => ({
                messageId: message.id,
                userId: recipientId,
            })),
        });

        return { 
            message: {
                ...message,
                id: message.id.toString(),
                chatId: message.chat.id.toString(),
                sender: {
                    ...message.sender,
                    id: message.sender.id.toString(),
                    createdAt: message.sender.createdAt.toISOString(),
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

export async function getMessagesForChat(input: {
    userId: string,
    chatId: string,
    limit: number,
    since?: Date,
}): Promise<{ messages: Message[] }> {
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
        where: {
            chatId: input.chatId,
            createdAt: input.since ? {
                gte: input.since,
            } : undefined,
        },
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
                    preferredLang: true,
                    createdAt: true,
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
            receipts: {
                select: {
                    userId: true,
                    message: {
                        select: {
                            senderId: true,
                        },
                    },
                    deliveredAt: true,
                    readAt: true,
                },
            },
        },
        take: input.limit,
    });

    return {
        messages: messages.map((message) => ({
            ...message,
            id: message.id.toString(),
            chatId: message.chat.id.toString(),
            sender: {
                ...message.sender,
                id: message.sender.id.toString(),
                createdAt: message.sender.createdAt.toISOString(),
            },
            content: {
                ...message.content,
                id: message.content.id.toString(),
                translation: message.content.translations.length > 0 ? {
                    targetLang: message.content.translations[0]!.targetLang,
                    translatedText: message.content.translations[0]!.translatedText,
                } : undefined,
            },
            receipts: message.receipts
                .filter((receipt) => receipt.message.senderId === input.userId)
                .map((receipt) => ({
                    userId: receipt.userId.toString(),
                    deliveredAt: receipt.deliveredAt?.toISOString() ?? null,
                    readAt: receipt.readAt?.toISOString() ?? null,
                })),
            createdAt: message.createdAt.toISOString(),
            updatedAt: message.updatedAt.toISOString(),
        })),
    }
}

export async function markMessagesAsDeliveredOrRead(input: {
    recipientId: string,
    messageIds: string[],
    type: "delivered" | "read",
}): Promise<void> {
    const pendingReceipts = await prisma.messageReceipt.findMany({
        where: {
            messageId: {
                in: input.messageIds,
            },
            userId: input.recipientId,
            [input.type === "delivered" ? "deliveredAt" : "readAt"]: null,
        },
        select: {
            message: {
                select: {
                    id: true,
                    senderId: true,
                },
            },
        },
    });

    const messageIdsToUpdate = pendingReceipts.filter((receipt) => receipt.message.senderId !== input.recipientId).map((receipt) => receipt.message.id);

    if (messageIdsToUpdate.length === 0) {
        return;
    }

    const timestamp = new Date();

    await prisma.messageReceipt.updateMany({
        where: {
            messageId: {
                in: messageIdsToUpdate,
            },
            userId: input.recipientId,
            [input.type === "delivered" ? "deliveredAt" : "readAt"]: null,
        },
        data: {
            [input.type === "delivered" ? "deliveredAt" : "readAt"]: timestamp,
        },
    });

    try {
        const updatesBySender = new Map<string, MessageReceiptUpdate[]>();

        for (const receipt of pendingReceipts) {
            const senderId = receipt.message.senderId;
            if (senderId === input.recipientId) continue;

            const update: MessageReceiptUpdate = {
                messageId: receipt.message.id,
                userId: input.recipientId,
                [input.type === "delivered" ? "deliveredAt" : "readAt"]: timestamp.toISOString(),
            };

            const list = updatesBySender.get(senderId) ?? [];
            list.push(update);
            updatesBySender.set(senderId, list);
        }

        await Promise.all(
            Array.from(updatesBySender.entries()).map(([senderId, updates]) =>
                sendToUser(senderId, {
                    type: "message.receipt.updated",
                    data: updates,
                }),
            ),
        );
    } catch (error) {
        console.error("WebSocket fanout failed", error);
    }
}