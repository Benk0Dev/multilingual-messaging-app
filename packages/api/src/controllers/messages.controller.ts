import { Request, Response } from "express";
import { CreateMessageBody, GetMessagesQuery, UpdateMessageReceiptBody, Uuid } from "@app/shared-types/schemas";
import * as messagesService from "../services/messages.service";

export async function createMessageForChat(req: Request, res: Response) {
    try {
        const { chatId } = req.validated?.params as { chatId: Uuid };
        const body = req.validated?.body as CreateMessageBody;

        const message = await messagesService.createMessageForChat({
            chatId,
            senderId: req.auth!.sub,
            content: {
                text: body.content.text,
            },
            clientId: body.clientId,
        });

        return res.status(201).json({
            message: {...message, clientId: body.clientId},
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
        const { chatId } = req.validated?.params as { chatId: Uuid };
        const { limit, since, before } = req.validated?.query as unknown as GetMessagesQuery;

        const { messages } = await messagesService.getMessagesForChat({
            userId: req.auth!.sub,
            chatId,
            limit,
            since,
            before,
        });

        return res.status(200).json({ messages });
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

export async function markMessagesAsDeliveredOrRead(
    req: Request,
    res: Response,
    type: "delivered" | "read",
) {
    try {
        const body = req.validated?.body as UpdateMessageReceiptBody;

        await messagesService.markMessagesAsDeliveredOrRead({
            recipientId: req.auth!.sub,
            messageIds: body.messageIds,
            type,
        });

        return res.status(200).json({ success: true });
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

export async function markAllMessagesAsDelivered(req: Request, res: Response) {
    try {
        await messagesService.markAllMessagesAsDelivered({
            recipientId: req.auth!.sub,
        });
        return res.status(200).json({ success: true });
    } catch (err: any) {
        console.error(err);
        return res.status(500).json({ error: "Internal server error" });
    }
}