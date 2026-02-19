import { prisma } from "@app/db";

export async function createMessageForChat(chatId: string, senderId: string, content: { textBody: string }) {
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

    const message = prisma.$transaction(async (tx) => {
        const messageContent = await tx.messageContent.create({
            data: {
                textBody: content.textBody,
                originalLanguage: "en", // temporary hardcoding
            },
            select: {
                id: true,
                textBody: true,
                originalLanguage: true,
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
                chatId: true,
                senderId: true,
                createdAt: true,
            },
        });

        return {
            ...message,
            content: messageContent,
        };

    });

    return message;
}

export async function getMessagesForChat(chatId: string) {
    return prisma.message.findMany({
        where: { chatId },
        orderBy: { createdAt: "asc" },
        include: {
            sender: {
                select: {
                    id: true,
                    displayName: true,
                },
            },
            content: {
                select: {
                    id: true,
                    textBody: true,
                    originalLanguage: true,
                },
            },
        },
    });
}