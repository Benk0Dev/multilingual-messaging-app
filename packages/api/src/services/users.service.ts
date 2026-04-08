import { prisma } from "@app/db";
import { User, SearchUsersResult } from "@app/shared-types/models";

export async function createUser(input: {
    id: string;
    username: string;
    displayName: string;
    preferredLang: string;
}): Promise<User> {
    const existing = await prisma.user.findUnique({
        where: {
            id: input.id,
        },
    });

    if (existing) {
        throw new Error("already_exists");
    }

    const user = await prisma.user.create({
        data: {
            id: input.id,
            username: input.username,
            displayName: input.displayName,
            preferredLang: input.preferredLang,
        },
        select: {
            id: true,
            username: true,
            displayName: true,
            preferredLang: true,
            createdAt: true,
        },
    });

    return {
        ...user,
        id: user.id.toString(),
        createdAt: user.createdAt.toISOString(),
    };
}

export async function getUser(input: { 
    id: string;
}): Promise<User> {
    const user = await prisma.user.findUnique({
        where: {
            id: input.id,
        },
    });

    if (!user) {
        throw new Error("not_found");
    }

    return {
        ...user,
        id: user.id.toString(),
        createdAt: user.createdAt.toISOString(),
    };
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
                                    text: true,
                                    originalLang: true,
                                    translations: {
                                        select: {
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
                        },
                    },
                },
            },
        },
    });

    const existingUsersMap = new Map<string, SearchUsersResult>();

    for (const match of existingChatMatches) {
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
                        ...match.chat,
                        id: match.chat.id.toString(),
                        createdAt: match.chat.createdAt.toISOString(),
                        members: match.chat.members.map((member) => ({
                            ...member.user,
                            id: member.user.id.toString(),
                            createdAt: member.user.createdAt.toISOString(),
                        })),
                        lastMessage: match.chat.messages[0] ? {
                            ...match.chat.messages[0],
                            id: match.chat.messages[0].id.toString(),
                            content: {
                                ...match.chat.messages[0].content,
                                id: match.chat.messages[0].content.id.toString(),
                            },
                            sender: {
                                ...match.chat.messages[0].sender,
                                id: match.chat.messages[0].sender.id.toString(),
                                createdAt: match.chat.messages[0].sender.createdAt.toISOString(),
                            },
                            createdAt: match.chat.messages[0].createdAt.toISOString(),
                            updatedAt: match.chat.messages[0].updatedAt.toISOString(),
                        } : undefined,
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

    return [...existingUsersMap.values(), ...globalMatches.map((match) => ({
        user: {
            ...match,
            id: match.id.toString(),
            createdAt: match.createdAt.toISOString(),
        },
    }))];
}