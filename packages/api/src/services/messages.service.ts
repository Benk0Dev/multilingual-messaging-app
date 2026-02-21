import { prisma } from "@app/db";
import { Message } from "@app/shared-types/models";

export async function createMessageForChat(chatId: string, senderId: string, content: { text: string }) {
    const validIds = Promise.all([
        prisma.chat.findUnique({ where: { id: chatId }, select: { id: true } }),
        prisma.user.findUnique({ where: { id: senderId }, select: { id: true } }),
    ]);

    const [chat, sender] = await validIds;

    if (!chat) {
        throw new Error("chat_not_found");
    }

    if (!sender) {
        throw new Error("sender_not_found");
    }

    return prisma.$transaction(async (tx) => {
        const messageContent = await tx.messageContent.create({
            data: {
                text: content.text,
                originalLang: "en", // temporary hardcoding
            },
            select: {
                id: true,
                text: true,
                originalLang: true,
            },
        });

        const message = await tx.message.create({
            data: {
                chatId,
                senderId,
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
        } satisfies Message;

    });
}

export async function getMessagesForChat(chatId: string) {
    const messages = await prisma.message.findMany({
        where: { chatId },
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
            },
            createdAt: message.createdAt.toISOString(),
            updatedAt: message.updatedAt.toISOString(),
        })) satisfies Message[],
    }
}