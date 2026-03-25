import { Request, Response } from "express";
import * as messagesService from "../services/messages.service";

export type CreateMessageBody = {
    content: {
        text: string;
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
            },
        });

        return res.status(201).json({
            message,
        });
    } catch (err: any) {
        console.error(err);

        if (err.message === "content_empty") {
            return res.status(400).json({ error: "Content is empty" });
        }

        if (err.message === "membership_not_found") {
            return res.status(400).json({ error: "User is not a member of this chat" });
        }

        if (err.message === "sender_not_found") {
            return res.status(400).json({ error: "Sender not found" });
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

        const messages = await messagesService.getMessagesForChat({
            userId: req.auth!.sub,
            chatId,
        });

        return res.json(messages);
    } catch (err: any) {
        console.error(err);

        if (err.message === "user_not_found") {
            return res.status(400).json({ error: "User not found" });
        }

        if (err.message === "membership_not_found") {
            return res.status(400).json({ error: "User is not a member of this chat" });
        }

        return res.status(500).json({ error: "Internal server error" });
    }
}

type UpdateMessageReceiptBody = {
    messageIds: string[];
};

export async function markMessagesAsDeliveredOrRead(req: Request, res: Response, type: "delivered" | "read") {
    try {
        const body = req.body as UpdateMessageReceiptBody;
        const messageIds = Array.isArray(body.messageIds) ? body.messageIds : [body.messageIds];

        if (messageIds.length === 0) {
            return res.status(400).json({ error: "messageIds required" });
        }

        await messagesService.markMessagesAsDeliveredOrRead({
            recipientId: req.auth!.sub,
            messageIds,
            type,
        });

        return res.json({ success: true });
    } catch (err: any) {
        console.error(err);
        return res.status(500).json({ error: "Internal server error" });
    }
}

export async function markMessagesAsDelivered(req: Request, res: Response) {
    return await markMessagesAsDeliveredOrRead(req, res, "delivered");
}

export async function markMessagesAsRead(req: Request, res: Response) {
    return await markMessagesAsDeliveredOrRead(req, res, "read");
}