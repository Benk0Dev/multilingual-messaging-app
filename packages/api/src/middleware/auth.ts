import type { Request, Response, NextFunction } from "express";
import { CognitoJwtVerifier } from "aws-jwt-verify";
import { requiredEnv } from "../utils/requiredEnv";

declare global {
    namespace Express {
        interface Request {
            auth?: {
                sub: string;
                username?: string;
            };
        }
    }
}

const userPoolId = requiredEnv("COGNITO_USER_POOL_ID");
const clientId = requiredEnv("COGNITO_USER_POOL_CLIENT_ID");

const verifier = CognitoJwtVerifier.create({
    userPoolId,
    tokenUse: "access",
    clientId,
});

export async function requireAuth(req: Request, res: Response, next: NextFunction) {
    try {
        const header = req.headers.authorization;
        if (!header?.startsWith("Bearer ")) {
            return res.status(401).json({ error: "Missing Authorization Bearer token" });
        }

        const token = header.slice("Bearer ".length);
        const payload = await verifier.verify(token);

        const sub = payload.sub;
        if (typeof sub !== "string") {
            return res.status(401).json({ error: "Token missing sub" });
        }

        req.auth = {
            sub,
            username: typeof payload.username === "string" ? payload.username : undefined,
        };

        return next();
    } catch (e) {
        return res.status(401).json({ error: "Invalid or expired token" });
    }
}