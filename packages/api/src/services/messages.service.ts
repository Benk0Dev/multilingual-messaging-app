import { prisma } from "@app/db";

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