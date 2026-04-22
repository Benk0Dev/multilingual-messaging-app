import { prisma } from "@app/db";
import { Message, MessageReceiptUpdate } from "@app/shared-types/models";
import { sendToUser } from "./realtime.service";
import { translateText } from "./translate.service";
import { encrypt, decrypt } from "./crypto.service";
import { decryptContent } from "../utils/messageContent";

// Backfills missing translations
export async function ensureTranslations(input: {
    contentIds: string[];
    targetLang: string;
}): Promise<Map<string, {
    targetLang: string;
    translatedTextCipher: Uint8Array<ArrayBuffer>;
    translatedTextNonce: Uint8Array<ArrayBuffer>;
}>> {
    if (input.contentIds.length === 0) {
        return new Map();
    }

    const contents = await prisma.messageContent.findMany({
        where: {
            id: {
                in: input.contentIds,
            },
            originalLang: {
                not: input.targetLang,
            },
            translations: {
                none: {
                    targetLang: input.targetLang,
                },
            },
        },
        select: {
            id: true,
            textCipher: true,
            textNonce: true,
            originalLang: true,
        },
    });

    if (contents.length === 0) {
        return new Map();
    }

    const settled = await Promise.allSettled(contents.map(async (content) => {
        const plaintext = decrypt(content.textCipher, content.textNonce);
        const translatedText = await translateText(plaintext, content.originalLang, input.targetLang);
        const { cipher, nonce } = encrypt(translatedText);
        return {
            contentId: content.id,
            targetLang: input.targetLang,
            translatedTextCipher: cipher,
            translatedTextNonce: nonce,
        };
    }));

    const created: {
        contentId: string;
        targetLang: string;
        translatedTextCipher: Uint8Array<ArrayBuffer>;
        translatedTextNonce: Uint8Array<ArrayBuffer>;
    }[] = [];

    for (const result of settled) {
        if (result.status === "fulfilled") {
            created.push(result.value);
        } else {
            console.error("ensureTranslations: translation failed for one message", result.reason);
        }
    }

    if (created.length === 0) {
        return new Map();
    }

    await prisma.messageTranslation.createMany({
        data: created,
        skipDuplicates: true,
    });

    const byContentId = new Map<string, {
        targetLang: string;
        translatedTextCipher: Uint8Array<ArrayBuffer>;
        translatedTextNonce: Uint8Array<ArrayBuffer>;
    }>();
    for (const t of created) {
        byContentId.set(t.contentId, {
            targetLang: t.targetLang,
            translatedTextCipher: t.translatedTextCipher,
            translatedTextNonce: t.translatedTextNonce,
        });
    }
    return byContentId;
}

export async function createMessageForChat(input: {
    chatId: string,
    senderId: string,
    content: {
        text: string;
    };
    clientId?: string;
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
        where: {
            id: input.senderId,
        },
        select: {
            preferredLang: true,
        },
    });

    if (!sender) {
        throw new Error("sender_not_found");
    }

    const senderLang = sender.preferredLang;

    const recipientIds = (await prisma.chatMember.findMany({
        where: {
            chatId: input.chatId,
        },
        select: {
            userId: true,
        },
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

    const { cipher: textCipher, nonce: textNonce } = encrypt(input.content.text);
    const encryptedTranslations = translations.map((translation) => {
        const { cipher, nonce } = encrypt(translation.translatedText);
        return { ...translation, cipher, nonce };
    });

    const result = await prisma.$transaction(async (tx) => {
        const messageContent = await tx.messageContent.create({
            data: {
                textCipher,
                textNonce,
                originalLang: senderLang,
            },
            select: {
                id: true,
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
                isDeleted: true,
                createdAt: true,
                updatedAt: true,
            },
        });

        if (encryptedTranslations.length > 0) {
            await tx.messageTranslation.createMany({
                data: encryptedTranslations.map((translation) => ({
                    contentId: messageContent.id,
                    targetLang: translation.targetLang,
                    translatedTextCipher: translation.cipher,
                    translatedTextNonce: translation.nonce,
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
                    id: messageContent.id.toString(),
                    text: input.content.text,
                    originalLang: senderLang,
                },
                createdAt: message.createdAt.toISOString(),
                updatedAt: message.updatedAt.toISOString(),
            },
            translations,
        };
    });

    try {
        const recipientSends = recipientIds.map((recipientId) => {
            const translation = result.translations.find((t) => t.recipientId === recipientId);
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
                    },
                },
            };
            return sendToUser(recipientId, payload);
        });

        const senderEcho = sendToUser(input.senderId, {
            type: "message.created",
            message: {
                ...result.message,
                clientId: input.clientId,
            },
        });

        await Promise.all([...recipientSends, senderEcho]);
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
    before?: Date,
}): Promise<{ messages: Message[] }> {
    const user = await prisma.user.findUnique({
        where: {
            id: input.userId,
        },
        select: {
            preferredLang: true,
        },
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
            createdAt: (input.since || input.before) ? {
                ...(input.since ? { gte: input.since } : {}),
                ...(input.before ? { lt: input.before } : {}),
            } : undefined,
        },
        orderBy: {
            createdAt: "desc",
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
                    textCipher: true,
                    textNonce: true,
                    originalLang: true,
                    translations: {
                        where: {
                            targetLang: userLang,
                        },
                        select: {
                            targetLang: true,
                            translatedTextCipher: true,
                            translatedTextNonce: true,
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

    messages.reverse();

    const missingContentIds = messages
    .filter((message) =>
        message.sender.id !== input.userId &&
        message.content.originalLang !== userLang &&
        message.content.translations.length === 0
    )
    .map((message) => message.content.id);

    if (missingContentIds.length > 0) {
        const created = await ensureTranslations({
            contentIds: missingContentIds,
            targetLang: userLang,
        });
        for (const message of messages) {
            const newTranslation = created.get(message.content.id);
            if (newTranslation) {
                message.content.translations.push(newTranslation);
            }
        }
    }

    for (const message of messages) {
        if (message.sender.id === input.userId) {
            message.content.translations = [];
        }
    }

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
            content: decryptContent(message.content),
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
    };
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

    await fanoutReceiptUpdates({
        recipientId: input.recipientId,
        receipts: pendingReceipts.map((r) => ({ messageId: r.message.id, senderId: r.message.senderId })),
        type: input.type,
        timestamp,
    });
}

export async function markAllMessagesAsDelivered(input: {
    recipientId: string,
}): Promise<void> {
    const pendingReceipts = await prisma.messageReceipt.findMany({
        where: {
            userId: input.recipientId,
            deliveredAt: null,
            message: {
                senderId: {
                    not: input.recipientId,
                },
            },
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

    if (pendingReceipts.length === 0) {
        return;
    }

    const timestamp = new Date();
    const messageIds = pendingReceipts.map((r) => r.message.id);

    await prisma.messageReceipt.updateMany({
        where: {
            messageId: {
                in: messageIds,
            },
            userId: input.recipientId,
            deliveredAt: null,
        },
        data: {
            deliveredAt: timestamp,
        },
    });

    await fanoutReceiptUpdates({
        recipientId: input.recipientId,
        receipts: pendingReceipts.map((r) => ({ messageId: r.message.id, senderId: r.message.senderId })),
        type: "delivered",
        timestamp,
    });
}

async function fanoutReceiptUpdates(input: {
    recipientId: string;
    receipts: { messageId: string; senderId: string }[];
    type: "delivered" | "read";
    timestamp: Date;
}): Promise<void> {
    try {
        const updatesBySender = new Map<string, MessageReceiptUpdate[]>();
        const updatesForSelf: MessageReceiptUpdate[] = [];

        for (const receipt of input.receipts) {
            if (receipt.senderId === input.recipientId) continue;

            const update: MessageReceiptUpdate = {
                messageId: receipt.messageId,
                userId: input.recipientId,
                [input.type === "delivered" ? "deliveredAt" : "readAt"]: input.timestamp.toISOString(),
            };

            const list = updatesBySender.get(receipt.senderId) ?? [];
            list.push(update);
            updatesBySender.set(receipt.senderId, list);
            updatesForSelf.push(update);
        }

        const senderSends = Array.from(updatesBySender.entries()).map(([senderId, updates]) =>
            sendToUser(senderId, {
                type: "message.receipt.updated",
                data: updates,
            })
        );

        const selfEcho = updatesForSelf.length > 0
            ? sendToUser(input.recipientId, {
                type: "message.receipt.updated",
                data: updatesForSelf,
              })
            : Promise.resolve();

        await Promise.all([...senderSends, selfEcho]);
    } catch (error) {
        console.error("WebSocket fanout failed", error);
    }
}