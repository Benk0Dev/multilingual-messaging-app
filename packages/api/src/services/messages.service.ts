import { prisma } from "@app/db";
import { Message } from "@app/shared-types/models";

export async function createMessageForChat(input: {
    chatId: string,
    senderId: string,
    content: { 
        text: string;
        originalLang: string;
    };
}) {
    const memberships = await prisma.chatMember.findUnique({
        where: {
            chatId_userId: {
                chatId: input.chatId,
                userId: input.senderId,
            },
        },
    });

    if (!memberships) {
        throw new Error("membership_not_found");
    }

    return prisma.$transaction(async (tx) => {
        const messageContent = await tx.messageContent.create({
            data: {
                text: input.content.text,
                originalLang: input.content.originalLang,
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

export async function getMessagesForChat(input: { chatId: string }) {
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