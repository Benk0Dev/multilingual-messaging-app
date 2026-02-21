import { prisma } from "@app/db";
import { User } from "@app/shared-types/models";

export async function createUser(input: { username: string; displayName: string; preferredLang: string }) {
    // TODO: impement authentication service

    const user = await prisma.user.create({
        data: {
            // id: id from auth service,
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