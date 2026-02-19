import { Request, Response } from "express";
import * as usersService from "../services/users.service";

type CreateUserBody = {
    // email: string;
    displayName: string;
    preferredLanguage: string;
};

export async function createUser(req: Request, res: Response) {
    try {
        const body = req.body as CreateUserBody;

        // TODO: add proper validation (e.g. using zod or similar)
        const displayName = body.displayName.trim();

        const user = await usersService.createUser({ displayName, preferredLanguage: body.preferredLanguage });

        return res.status(201).json({
            user,
        });
    } catch (err: any) {
         console.error(err);
        return res.status(500).json({ error: "Internal server error" });
    }
}