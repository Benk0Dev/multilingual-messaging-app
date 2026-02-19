import { Request, Response } from "express";
import * as messagesService from "../services/messages.service";

type CreateMessageBody = {
    senderId: string;
    content: {
        textBody: string;
    };
};

export async function createMessageForChat(req: Request, res: Response) {
    try {
        const { chatId } = req.params;

        if (!chatId || Array.isArray(chatId)) {
            return res.status(400).json({ error: "chatId required" });
        }

        const body = req.body as CreateMessageBody;
        const message = await messagesService.createMessageForChat(chatId, body.senderId, body.content);

        return res.status(201).json({
            message,
        });
    } catch (err: any) {
        console.error(err);

        if (err.message === "chat_not_found") {
            return res.status(400).json({ error: "Chat ID not found" });
        }

        if (err.message === "sender_not_found") {
            return res.status(400).json({ error: "Sender ID not found" });
        }

        return res.status(500).json({ error: "Internal server error" });
    }
}

export async function getMessagesForChat(req: Request, res: Response) {
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