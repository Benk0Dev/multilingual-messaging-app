import { Router } from "express";
import { createUser, getMe } from "../controllers/users.controller";
import { createChat, getChatsByUser } from "../controllers/chats.controller";
import { createMessageForChat, getMessagesForChat } from "../controllers/messages.controller";

const router = Router();

// POST routes
router.post("/users", createUser);
router.post("/chats", createChat); 
router.post("/chats/:chatId/messages", createMessageForChat);

// GET routes
router.get("/users/me", getMe);
router.get("/users/:userId/chats", getChatsByUser);
router.get("/chats/:chatId/messages", getMessagesForChat);

export default router;