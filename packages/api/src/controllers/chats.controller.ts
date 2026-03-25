import { Request, Response } from "express";
import * as chatsService from "../services/chats.service";
import * as messagesService from "../services/messages.service";
import { CreateMessageBody } from "./messages.controller";

export type CreateChatAndSendFirstMessageBody = {
    userIds: string[]; // not including the current user
    content: CreateMessageBody["content"];
};

export async function findOrCreateChatAndSendFirstMessage(req: Request, res: Response) {
    try {
        const body = req.body as CreateChatAndSendFirstMessageBody;

        const chat = await chatsService.findOrCreateChat({ userIds: [req.auth!.sub, ...body.userIds] });

        const message = await messagesService.createMessageForChat({
            chatId: chat.id,
            senderId: req.auth!.sub,
            content: body.content,
        });

        return res.status(201).json({
            chat,
            message,
        });
    } catch (err: any) {
        console.error(err);

        if (err.message === "invalid_user_ids") {
            return res.status(400).json({ error: "One or more user IDs are invalid" });
        }

        if (err.message === "content_empty") {
            return res.status(400).json({ error: "Content is empty" });
        }

        if (err.message === "sender_not_found") {
            return res.status(400).json({ error: "Sender not found" });
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