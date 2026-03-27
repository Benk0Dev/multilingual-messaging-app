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
                    id: user.id,
                    username: user.username,
                    displayName: user.displayName,
                    pictureUrl: user.pictureUrl,
                    chatId: match.chat.id,
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
        },
        take: input.limit,
    });

    return [
        ...existingUsersMap.values(),
        ...globalMatches.map((match) => ({
            id: match.id,
            username: match.username,
            displayName: match.displayName,
            pictureUrl: match.pictureUrl,
        })),
    ];
}