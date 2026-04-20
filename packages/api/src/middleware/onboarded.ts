import type { Request, Response, NextFunction } from "express";
import { prisma } from "@app/db";

export async function requireOnboarded(req: Request, res: Response, next: NextFunction) {
    const sub = req.auth?.sub;

    if (!sub) {
        // Should have been caught by requireAuth, but guard anyway
        return res.status(401).json({ error: "Not authenticated" });
    }

    const user = await prisma.user.findUnique({
        where: { id: sub },
        select: { id: true },
    });

    if (!user) {
        return res.status(403).json({ error: "Onboarding not completed" });
    }

    return next();
}