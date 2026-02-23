import { Request, Response } from "express";
import * as usersService from "../services/users.service";
import { NewUserDetails, newUserDetailsSchema } from "@app/shared-types/schemas";

export async function createUser(req: Request, res: Response) {
    try {
        const body = req.body as NewUserDetails;

        const validatedBody = newUserDetailsSchema.safeParse(body);

        if (!validatedBody.success || !validatedBody.data) {
            return res.status(400).json({ error: "Invalid request body" });
        }

        const user = await usersService.createUser({ 
            id: req.auth!.sub,
            username: req.auth!.username!,
            displayName: validatedBody.data.displayName,
            preferredLang: validatedBody.data.preferredLang,
        });

        return res.status(201).json({
            user: user,
        });
    } catch (err: any) {
        if (err.message === "already_exists") {
            return res.status(400).json({ error: "User already exists" });
        }

        return res.status(500).json({ error: "Internal server error" });
    }
}

export async function getMe(req: Request, res: Response) {
    try {
        const auth = req.auth!;

        const user = await usersService.getUser({ id: auth.sub });

        return res.status(200).json({
            user: user,
        });
    } catch (err: any) {
        if (err.message === "not_found") {
            return res.status(404).json({ error: "User not found" });
        }

        return res.status(500).json({ error: "Internal server error" });
    }
}