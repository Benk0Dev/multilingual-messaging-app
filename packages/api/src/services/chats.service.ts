import { prisma } from "@app/db";
import { Chat } from "@app/shared-types/models";

export async function createChat(input: { userIds: string[] }) {
    const validUserIds = await prisma.user.findMany({
        where: {
            id: {
                in: input.userIds,
            },
        },
        select: {
            id: true,
            username: true,
            displayName: true,
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

    return await prisma.$transaction(async (tx) => {
        const chat = await tx.chat.create({
            data: {},
            select: {
                id: true,
                createdAt: true,
            },
        });

        await tx.chatMember.createMany({
            data: validUserIds.map((user) => ({
                chatId: chat.id,
                userId: user.id,
            })),
        });

        return {
            ...chat,
            id: chat.id.toString(),
            createdAt: chat.createdAt.toISOString(),
            members: validUserIds.map((user) => ({
                id: user.id.toString(),
                username: user.username,
                displayName: user.displayName,
            })),
        } satisfies Chat;
    });
}

export async function getChatsForUser(userId: string) {
    // TODO: order by last message
    const chats = await prisma.chat.findMany({
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
            members: {
                select: {
                    user: {
                        select: {
                            id: true,
                            username: true,
                            displayName: true,
                        },
                    },
                },
            },
        },
    });

    return chats.map((chat) => ({
        ...chat,
        id: chat.id.toString(),
        createdAt: chat.createdAt.toISOString(),
        members: chat.members.map((member) => ({
            ...member.user,
            id: member.user.id.toString(),
        })),
    })) satisfies Chat[];
}