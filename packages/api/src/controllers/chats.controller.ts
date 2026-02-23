import { Request, Response } from "express";
import * as chatsService from "../services/chats.service";

type CreateChatBody = {
    userIds: string[];
};

export async function createChat(req: Request, res: Response) {
    try {
        const body = req.body as CreateChatBody;

        const chat = await chatsService.createChat({ userIds: body.userIds });

        return res.status(201).json({
            chat,
        });
    } catch (err: any) {
        console.error(err);

        if (err.message === "invalid_user_ids") {
            return res.status(400).json({ error: "One or more user IDs are invalid" });
        }

        if (err.message === "already_exists") {
            return res.status(400).json({ error: "A chat with the specified users already exists" });
        }
        
        return res.status(500).json({ error: "Internal server error" });
    }
}

export async function getChatsForMe(req: Request, res: Response) {
    try {
        const chats = await chatsService.getChatsForUser(req.auth!.sub);

        return res.status(201).json({
            chats,
        });
    } catch (err: any) {
        console.error(err);        
        return res.status(500).json({ error: "Internal server error" });
    }
}