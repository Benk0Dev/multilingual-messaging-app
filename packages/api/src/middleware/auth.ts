import type { Request, Response, NextFunction } from "express";
import { createRemoteJWKSet, jwtVerify } from "jose";

declare global {
    namespace Express {
        interface Request {
            auth?: {
                sub: string;
                username?: string;
                email?: string;
            };
        }
    }
}

function requiredEnv(name: string): string {
    const v = process.env[name];
    if (!v) throw new Error(`${name} is missing`);
    return v;
}

const region = requiredEnv("COGNITO_REGION");
const userPoolId = requiredEnv("COGNITO_USER_POOL_ID");
const clientId = requiredEnv("COGNITO_USER_POOL_CLIENT_ID");

const issuer = `https://cognito-idp.${region}.amazonaws.com/${userPoolId}`;
const jwks = createRemoteJWKSet(new URL(`${issuer}/.well-known/jwks.json`));

export async function requireAuth(req: Request, res: Response, next: NextFunction) {
    try {
        const header = req.headers.authorization;
        if (!header?.startsWith("Bearer ")) {
            return res.status(401).json({ error: "Missing Authorization Bearer token" });
        }

        const token = header.slice("Bearer ".length);

        const { payload } = await jwtVerify(token, jwks, { issuer });

        if (payload.token_use !== "access") {
            return res.status(401).json({ error: "Wrong token type" });
        }

        if (payload.client_id !== clientId) {
            return res.status(401).json({ error: "Wrong client" });
        }

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