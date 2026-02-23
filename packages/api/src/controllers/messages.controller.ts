import { Request, Response } from "express";
import { getUser } from "../services/users.service";
import * as messagesService from "../services/messages.service";

type CreateMessageBody = {
    content: {
        text: string;
        // originalLang: string;
    };
};

export async function createMessageForChat(req: Request, res: Response) {
    try {
        const { chatId } = req.params;

        if (!chatId || Array.isArray(chatId)) {
            return res.status(400).json({ error: "chatId required" });
        }

        const body = req.body as CreateMessageBody;

        const message = await messagesService.createMessageForChat({
            chatId,
            senderId: req.auth!.sub,
            content: {
                text: body.content.text,
                originalLang: "en", // temporary hardcoding
            },
        });

        return res.status(201).json({
            message,
        });
    } catch (err: any) {
        console.error(err);

        if (err.message === "membership_not_found") {
            return res.status(400).json({ error: "User is not a member of this chat" });
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

        const messages = await messagesService.getMessagesForChat({ chatId });

        return res.json(messages);
    } catch (err) {
        console.error(err);
        return res.status(500).json({ error: "Internal server error" });
    }
}