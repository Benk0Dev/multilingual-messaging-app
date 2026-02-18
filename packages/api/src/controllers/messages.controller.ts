import { Request, Response } from "express";
import * as messagesService from "../services/messages.service";

export async function getMessages(req: Request, res: Response) {
    try {
        const { chatId } = req.params;

        if (!chatId || Array.isArray(chatId)) {
            return res.status(400).json({ error: "chatId required" });
        }

        const messages = await messagesService.getMessagesForChat(chatId);

        return res.json(messages);
    } catch (err) {
        console.error(err);
        return res.status(500).json({ error: "Internal server error" });
    }
}