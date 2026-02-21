import { Request, Response } from "express";
import * as usersService from "../services/users.service";

type CreateUserBody = {
    // email: string;
    username: string;
    displayName: string;
    preferredLang: string;
};

export async function createUser(req: Request, res: Response) {
    try {
        const body = req.body as CreateUserBody;

        // TODO: add proper validation (e.g. using zod or similar)
        const username = body.username.trim();
        const displayName = body.displayName.trim();

        const user = await usersService.createUser({ username, displayName, preferredLang: body.preferredLang });

        return res.status(201).json({
            user,
        });
    } catch (err: any) {
         console.error(err);
        return res.status(500).json({ error: "Internal server error" });
    }
}