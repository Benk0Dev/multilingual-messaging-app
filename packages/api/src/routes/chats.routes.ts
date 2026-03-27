import { Router } from "express";
import { z } from "zod";
import { validate } from "../middleware/validate";
import { createChatAndSendFirstMessageBodySchema, createMessageBodySchema, getMessagesQuerySchema, uuidSchema } from "@app/shared-types/schemas";
import { findOrCreateChatAndSendFirstMessage, getChatsForMe } from "../controllers/chats.controller";
import { createMessageForChat, getMessagesForChat } from "../controllers/messages.controller";

const router = Router();

router.post(
    "/",
    validate(createChatAndSendFirstMessageBodySchema, "body"),
    findOrCreateChatAndSendFirstMessage
);
router.get(
    "/",
    getChatsForMe
);
router.post(
    "/:chatId/messages",
    validate(z.object({ chatId: uuidSchema }), "params"),
    validate(createMessageBodySchema, "body"),
    createMessageForChat
);
router.get(
    "/:chatId/messages",
    validate(z.object({ chatId: uuidSchema }), "params"),
    validate(getMessagesQuerySchema, "query"),
    getMessagesForChat
);

export default router;