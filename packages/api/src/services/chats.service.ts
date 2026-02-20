import { prisma } from "@app/db";

export async function createChat(input: { userIds: string[] }) {
    const validUserIds = await prisma.user.findMany({
        where: {
            id: {
                in: input.userIds,
            },
        },
        select: {
            id: true,
        },
    });

    if (validUserIds.length !== input.userIds.length) {
        throw new Error("invalid_user_ids");
    }

    const chatAlreadyExists = await prisma.chat.findFirst({
        where: {
            members: {
                every: {
                    userId: {
                        in: input.userIds,
                    },
                },
            },
        },
    });

    if (chatAlreadyExists) {
        throw new Error("already_exists");
    }

    const chat = await prisma.$transaction(async (tx) => {
        const newChat = await tx.chat.create({
            data: {},
            select: {
                id: true,
                createdAt: true,
            },
        });

        await tx.chatMember.createMany({
            data: validUserIds.map((user) => ({
                chatId: newChat.id,
                userId: user.id,
            })),
        });

        return newChat;
    });

    return chat;
}

export async function getChatsByUser(userId: string) {
    // TODO: order by last message
    return await prisma.chat.findMany({
        where: {
            members: {
                some: {
                    userId,
                },
            },
        },
        select: {
            id: true,
            createdAt: true,
        },
    });
}