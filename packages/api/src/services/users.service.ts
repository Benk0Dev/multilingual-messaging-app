import { prisma } from "@app/db";
import { User } from "@app/shared-types/models";

export async function createUser(input: {
    id: string;
    username: string;
    displayName: string;
    preferredLang: string;
}) {
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
    } satisfies User;
}

export async function getUser(input: { 
    id: string;
}) {
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
    } satisfies User;
}