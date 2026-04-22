import { prisma } from "@app/db";
import { Chat } from "@app/shared-types/models";
import { sendToUsers } from "./realtime.service";
import { ensureTranslations } from "./messages.service";
import { decryptContent } from "../utils/messageContent";

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
    const me = await prisma.user.findUnique({
        where: {
            id: userId,
        },
        select: {
            preferredLang: true,
        },
    });
    if (!me) {
        throw new Error("user_not_found");
    }
    const userLang = me.preferredLang;

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

    // Backfill missing translations on last-message previews to handle user switching languages
    const missingContentIds: string[] = [];
    for (const chat of chats) {
        const lastMsg = chat.messages[0];
        if (
            lastMsg &&
            lastMsg.sender.id !== userId &&
            lastMsg.content.originalLang !== userLang &&
            lastMsg.content.translations.length === 0
        ) {
            missingContentIds.push(lastMsg.content.id);
        }
    }

    if (missingContentIds.length > 0) {
        const created = await ensureTranslations({
            contentIds: missingContentIds,
            targetLang: userLang,
        });
        for (const chat of chats) {
            const content = chat.messages[0]?.content;
            if (content) {
                const newTranslation = created.get(content.id);
                if (newTranslation) {
                    content.translations.push(newTranslation);
                }
            }
        }
    }

    for (const chat of chats) {
        const lastMsg = chat.messages[0];
        if (lastMsg && lastMsg.sender.id === userId) {
            lastMsg.content.translations = [];
        }
    }

    return chats.map((chat) => ({
        id: chat.id.toString(),
        createdAt: chat.createdAt.toISOString(),
        lastMessage: chat.messages[0] ? {
            ...chat.messages[0],
            id: chat.messages[0].id.toString(),
            content: decryptContent(chat.messages[0].content),
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