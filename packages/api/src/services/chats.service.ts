import { prisma } from "@app/db";
import { Chat } from "@app/shared-types/models";
import { sendToUsers } from "./realtime.service";

export async function findOrCreateChat(input: { userIds: string[] }): Promise<Chat> {
    // remove duplicates
    const uniqueUserIds = [...new Set(input.userIds)];
    
    const chat = await prisma.chat.findFirst({
        where: {
            AND: [
                // must contain every requested user
                ...uniqueUserIds.map((userId) => ({
                    members: {
                        some: {
                            userId,
                        },
                    },
                })),
                // must not contain any other users
                {
                    members: {
                        every: {
                            userId: {
                                in: uniqueUserIds,
                            },
                        },
                    },
                }
            ],
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
                            pictureUrl: true,
                            preferredLang: true,
                            createdAt: true,
                        },
                    },
                },
            },
        },
    });

    if (chat) {
        return {
            ...chat,
            id: chat.id.toString(),
            createdAt: chat.createdAt.toISOString(),
            members: chat.members.map((member) => ({
                ...member.user,
                id: member.user.id.toString(),
                createdAt: member.user.createdAt.toISOString(),
            })),
        };
    }
    
    const validUsers = await prisma.user.findMany({
        where: {
            id: {
                in: uniqueUserIds,
            },
        },
        select: {
            id: true,
            username: true,
            displayName: true,
            pictureUrl: true,
            preferredLang: true,
            createdAt: true,
        },
    });

    if (validUsers.length !== uniqueUserIds.length) {
        throw new Error("invalid_user_ids");
    }

    const result = await prisma.$transaction(async (tx) => {
        const chat = await tx.chat.create({
            data: {},
            select: {
                id: true,
                createdAt: true,
            },
        });

        await tx.chatMember.createMany({
            data: validUsers.map((user) => ({
                chatId: chat.id,
                userId: user.id,
            })),
        });

        return {
            ...chat,
            id: chat.id.toString(),
            createdAt: chat.createdAt.toISOString(),
            members: validUsers.map((user) => ({
                ...user,
                id: user.id.toString(),
                createdAt: user.createdAt.toISOString(),
            })),
        };
    });

    try {
        const allMemberIds = validUsers.map((u) => u.id);
        const payload = {
            type: "chat.created",
            chat: result,
        };
        await sendToUsers(allMemberIds, payload);
    } catch (error) {
        console.error("WebSocket fanout failed", error);
    }

    return result;
}

export async function getChatsForUser(userId: string): Promise<Chat[]> {
    const userLang = await prisma.user.findUnique({
        where: { id: userId },
        select: { preferredLang: true },
    });
    if (!userLang) {
        throw new Error("user_not_found");
    }

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
                            pictureUrl: true,
                            preferredLang: true,
                            createdAt: true,
                        },
                    },
                },
            },
            messages: {
                orderBy: {
                    createdAt: "desc",
                },
                take: 1,
                select: {
                    id: true,
                    content: {
                        select: {
                            id: true,
                            text: true,
                            originalLang: true,
                            translations: {
                                select: {
                                    contentId: true,
                                    targetLang: true,
                                    translatedText: true,
                                },
                            },
                        },
                    },
                    sender: {
                        select: {
                            id: true,
                            username: true,
                            displayName: true,
                            pictureUrl: true,
                            preferredLang: true,
                            createdAt: true,
                        },
                    },
                    isDeleted: true,
                    createdAt: true,
                    updatedAt: true,
                },
            },
        },
    });

    const translationsMap = new Map<string, {
        targetLang: string;
        translatedText: string;
    }>();

    chats.forEach((chat) => {
        chat.messages[0]?.content.translations.forEach((translation) => {
            translationsMap.set(translation.contentId, {
                targetLang: translation.targetLang,
                translatedText: translation.translatedText,
            });
        });
    });

    return chats.map((chat) => ({
        ...chat,
        id: chat.id.toString(),
        createdAt: chat.createdAt.toISOString(),
        lastMessage: chat.messages[0] ? {
            ...chat.messages[0],
            id: chat.messages[0].id.toString(),
            content: {
                ...chat.messages[0].content,
                id: chat.messages[0].content.id.toString(),
                translation: translationsMap.get(chat.messages[0].content.id),
            },
            sender: {
                ...chat.messages[0].sender,
                id: chat.messages[0].sender.id.toString(),
                createdAt: chat.messages[0].sender.createdAt.toISOString(),
            },
            createdAt: chat.messages[0].createdAt.toISOString(),
            updatedAt: chat.messages[0].updatedAt.toISOString(),
        } : undefined,
        members: chat.members.filter((member) => member.user.id !== userId).map((member) => ({
            ...member.user,
            id: member.user.id.toString(),
            createdAt: member.user.createdAt.toISOString(),
        })),
    })).sort((a, b) => new Date(b.lastMessage?.createdAt || 0).getTime() - new Date(a.lastMessage?.createdAt || 0).getTime());
}