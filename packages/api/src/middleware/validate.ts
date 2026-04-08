import { Request, Response, NextFunction } from "express";
import type { ZodSchema } from "zod";

declare global {
    namespace Express {
        interface Request {
            validated?: {
                body?: unknown;
                params?: unknown;
                query?: unknown;
            };
        }
    }
}

export function validate(
    schema: ZodSchema,
    path: "body" | "params" | "query",
) {
    return (req: Request, res: Response, next: NextFunction) => {
        const result = schema.safeParse(req[path]);

        if (!result.success) {
            return res.status(400).json({
                error: "Invalid request data",
                details: result.error.issues,
            });
        }

        req.validated ??= {};
        req.validated[path] = result.data;
        next();
    };
}