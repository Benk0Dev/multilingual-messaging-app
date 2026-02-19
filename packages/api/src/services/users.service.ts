import { prisma } from "@app/db";

export async function createUser(input: { displayName: string; preferredLanguage: string }) {
    // TODO: impement authentication service

    return prisma.user.create({
        data: {
            // id: id from auth service,
            displayName: input.displayName,
            preferredLanguage: input.preferredLanguage,
        },
        select: {
            id: true,
            displayName: true,
            preferredLanguage: true,
            createdAt: true,
        },
    });
}