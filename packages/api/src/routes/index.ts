import { Router } from "express";
import { createUser, getMe, searchUsers } from "../controllers/users.controller";
import { findOrCreateChatAndSendFirstMessage, getChatsForMe } from "../controllers/chats.controller";
import { createMessageForChat, getMessagesForChat, markMessagesAsDelivered, markMessagesAsRead } from "../controllers/messages.controller";

const router = Router();

// POST routes
router.post("/users", createUser);
router.post("/chats", findOrCreateChatAndSendFirstMessage); 
router.post("/chats/:chatId/messages", createMessageForChat);
router.post("/messages/delivered", markMessagesAsDelivered);
router.post("/messages/read", markMessagesAsRead);

// GET routes
router.get("/users/me", getMe);
router.get("/users/me/chats", getChatsForMe);
router.get("/users/search", searchUsers);
router.get("/chats/:chatId/messages", getMessagesForChat);

export default router;