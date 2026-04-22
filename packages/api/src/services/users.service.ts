import { prisma } from "@app/db";
import { User, SearchUsersResult } from "@app/shared-types/models";
import { decryptContent } from "../utils/messageContent";

function isUniqueConstraintError(err: unknown): boolean {
    return (
        typeof err === "object" &&
        err !== null &&
        "code" in err &&
        (err as { code: unknown }).code === "P2002"
    );
}

export async function createUser(input: {
    id: string;
    username: string;
    displayName: string;
    preferredLang: string;
    pictureUrl?: string;
}): Promise<User> {
    const existing = await prisma.user.findUnique({
        where: {
            id: input.id,
        },
    });

    if (existing) {
        throw new Error("already_exists");
    }

    try {
        const user = await prisma.user.create({
            data: {
                id: input.id,
                username: input.username,
                displayName: input.displayName,
                preferredLang: input.preferredLang,
                pictureUrl: input.pictureUrl,
            },
            select: {
                id: true,
                username: true,
                displayName: true,
                preferredLang: true,
                pictureUrl: true,
                createdAt: true,
            },
        });

        return {
            ...user,
            id: user.id.toString(),
            createdAt: user.createdAt.toISOString(),
        };
    } catch (err) {
        if (isUniqueConstraintError(err)) {
            throw new Error("username_taken");
        }
        throw err;
    }
}

export async function findUser(input: {
    id: string;
}): Promise<User | null> {
    const user = await prisma.user.findUnique({
        where: {
            id: input.id,
        },
    });

    if (!user) {
        return null;
    }

    return {
        ...user,
        id: user.id.toString(),
        createdAt: user.createdAt.toISOString(),
    };
}

export async function updateUser(input: {
    id: string;
    username?: string;
    displayName?: string;
    preferredLang?: string;
    pictureUrl?: string | null;
}): Promise<User> {
    const data: {
        username?: string;
        displayName?: string;
        preferredLang?: string;
        pictureUrl?: string | null;
    } = {};

    if (input.username !== undefined) data.username = input.username;
    if (input.displayName !== undefined) data.displayName = input.displayName;
    if (input.preferredLang !== undefined) data.preferredLang = input.preferredLang;
    if (input.pictureUrl !== undefined) data.pictureUrl = input.pictureUrl;

    if (Object.keys(data).length === 0) {
        throw new Error("no_changes");
    }

    try {
        const user = await prisma.user.update({
            where: {
                id: input.id,
            },
            data,
            select: {
                id: true,
                username: true,
                displayName: true,
                preferredLang: true,
                pictureUrl: true,
                createdAt: true,
            },
        });

        return {
            ...user,
            id: user.id.toString(),
            createdAt: user.createdAt.toISOString(),
        };
    } catch (err) {
        if (isUniqueConstraintError(err)) {
            throw new Error("username_taken");
        }
        throw err;
    }
}

export async function isUsernameAvailable(input: {
    username: string;
}): Promise<boolean> {
    const existing = await prisma.user.findUnique({
        where: {
            username: input.username,
        },
        select: {
            id: true,
        },
    });

    return existing === null;
}

export async function searchUsers(input: {
    currentUserId: string;
    query: string;
    limit: number;
}): Promise<SearchUsersResult[]> {
    const trimmedQuery = input.query.trim();

    if (!trimmedQuery) {
        return [];
    }

    const me = await prisma.user.findUnique({
        where: {
            id: input.currentUserId,
        },
        select: {
            preferredLang: true,
        },
    });
    if (!me) {
        return [];
    }
    const userLang = me.preferredLang;

    // First: users who already have a chat with the current user
    const existingChatMatches = await prisma.chatMember.findMany({
        where: {
            userId: input.currentUserId,
            chat: {
                members: {
                    some: {
                        userId: {
                            not: input.currentUserId,
                        },
                        user: {
                            OR: [
                                {
                                    username: {
                                        contains: trimmedQuery,
                                        mode: "insensitive",
                                    },
                                },
                                {
                                    displayName: {
                                        contains: trimmedQuery,
                                        mode: "insensitive",
                                    },
                                },
                            ],
                        },
                    },
                },
            },
        },
        select: {
            chat: {
                select: {
                    id: true,
                    createdAt: true,
                    members: {
                        where: {
                            userId: {
                                not: input.currentUserId,
                            },
                            user: {
                                OR: [
                                    {
                                        username: {
                                            contains: trimmedQuery,
                                            mode: "insensitive",
                                        },
                                    },
                                    {
                                        displayName: {
                                            contains: trimmedQuery,
                                            mode: "insensitive",
                                        },
                                    },
                                ],
                            },
                        },
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
                            isDeleted: true,
                            createdAt: true,
                            updatedAt: true,
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
                        },
                    },
                },
            },
        },
    });

    const existingUsersMap = new Map<string, SearchUsersResult>();

    for (const match of existingChatMatches) {
        const lastMsg = match.chat.messages[0];
        if (lastMsg && lastMsg.sender.id === input.currentUserId) {
            lastMsg.content.translations = [];
        }
    }

    for (const match of existingChatMatches) {
        const lastMsg = match.chat.messages[0];
        const lastMessage = lastMsg ? {
            ...lastMsg,
            id: lastMsg.id.toString(),
            content: decryptContent(lastMsg.content),
            sender: {
                ...lastMsg.sender,
                id: lastMsg.sender.id.toString(),
                createdAt: lastMsg.sender.createdAt.toISOString(),
            },
            createdAt: lastMsg.createdAt.toISOString(),
            updatedAt: lastMsg.updatedAt.toISOString(),
        } : undefined;

        for (const member of match.chat.members) {
            const user = member.user;

            if (!existingUsersMap.has(user.id)) {
                existingUsersMap.set(user.id, {
                    user: {
                        ...user,
                        id: user.id.toString(),
                        createdAt: user.createdAt.toISOString(),
                    },
                    chat: {
                        id: match.chat.id.toString(),
                        createdAt: match.chat.createdAt.toISOString(),
                        members: match.chat.members.map((m) => ({
                            ...m.user,
                            id: m.user.id.toString(),
                            createdAt: m.user.createdAt.toISOString(),
                        })),
                        lastMessage,
                    },
                });
            }
        }
    }

    const existingUserIds = [...existingUsersMap.keys()];

    // Second: global matches, excluding self and already included users
    const globalMatches = await prisma.user.findMany({
        where: {
            id: {
                not: input.currentUserId,
                notIn: existingUserIds,
            },
            OR: [
                {
                    username: {
                        contains: trimmedQuery,
                        mode: "insensitive",
                    },
                },
                {
                    displayName: {
                        contains: trimmedQuery,
                        mode: "insensitive",
                    },
                },
            ],
        },
        select: {
            id: true,
            username: true,
            displayName: true,
            pictureUrl: true,
            preferredLang: true,
            createdAt: true,
        },
        take: input.limit - existingUserIds.length,
    });

    return [
        ...existingUsersMap.values(),
        ...globalMatches.map((match) => ({
            user: {
                ...match,
                id: match.id.toString(),
                createdAt: match.createdAt.toISOString(),
            },
        })),
    ];
}