import { Request, Response } from "express";
import * as usersService from "../services/users.service";
import * as s3Service from "../services/s3.service";
import { CreateUserBody, UpdateUserBody, SearchUsersQuery, UsernameAvailableQuery } from "@app/shared-types/schemas";

export async function createUser(req: Request, res: Response) {
    try {
        const body = req.validated?.body as CreateUserBody;

        const user = await usersService.createUser({ 
            id: req.auth!.sub,
            username: body.username,
            displayName: body.displayName,
            preferredLang: body.preferredLang,
            pictureUrl: body.pictureUrl,
        });

        return res.status(201).json({ user });
    } catch (err: any) {
        if (err.message === "already_exists") {
            return res.status(400).json({ error: "User already exists" });
        }

        if (err.message === "username_taken") {
            return res.status(400).json({ error: "Username already taken" });
        }

        return res.status(500).json({ error: "Internal server error" });
    }
}

export async function getMe(req: Request, res: Response) {
    try {
        const auth = req.auth!;

        const user = await usersService.findUser({ id: auth.sub });

        return res.status(200).json({ user });
    } catch (err: any) {
        console.error(err);
        if (err.message === "not_found") {
            return res.status(404).json({ error: "User not found" });
        }

        return res.status(500).json({ error: "Internal server error" });
    }
}

export async function updateMe(req: Request, res: Response) {
    try {
        const body = req.validated?.body as UpdateUserBody;

        const user = await usersService.updateUser({
            id: req.auth!.sub,
            username: body.username,
            displayName: body.displayName,
            preferredLang: body.preferredLang,
            pictureUrl: body.pictureUrl,
        });

        return res.status(200).json({ user });
    } catch (err: any) {
        if (err.message === "username_taken") {
            return res.status(409).json({ error: "Username already taken" });
        }
        if (err.message === "no_changes") {
            return res.status(400).json({ error: "No fields to update" });
        }

        console.error(err);
        return res.status(500).json({ error: "Internal server error" });
    }
}

export async function checkUsernameAvailable(req: Request, res: Response) {
    try {
        const { username } = req.validated?.query as unknown as UsernameAvailableQuery;
 
        const available = await usersService.isUsernameAvailable({ username });
 
        return res.status(200).json({ available });
    } catch (err: any) {
        console.error(err);
        return res.status(500).json({ error: "Internal server error" });
    }
}
 
export async function getProfilePictureUploadUrl(req: Request, res: Response) {
    try {
        const { extension } = req.validated?.query as { extension: "jpg" | "jpeg" | "png" | "webp" };
 
        const result = await s3Service.generateProfilePictureUploadUrl({
            userId: req.auth!.sub,
            extension,
        });
 
        return res.status(200).json(result);
    } catch (err: any) {
        console.error(err);
        return res.status(500).json({ error: "Internal server error" });
    }
}

export async function searchUsers(req: Request, res: Response) {
    try {
        const { q, limit } = req.validated?.query as unknown as SearchUsersQuery;

        const users = await usersService.searchUsers({
            currentUserId: req.auth!.sub,
            query: q,
            limit,
        });

        return res.status(200).json({ users: users });
    } catch (err: any) {
        console.error(err);
        return res.status(500).json({ error: "Internal server error" });
    }
}