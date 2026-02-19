import { Router } from "express";
import { createUser } from "../controllers/users.controller";
import { createChat, getChatsByUser } from "../controllers/chats.controller";
import { createMessageForChat, getMessagesForChat } from "../controllers/messages.controller";

const router = Router();

router.post("/users", createUser);
router.post("/chats", createChat); 
router.post("/chats/:chatId/messages", createMessageForChat);

// router.get("/users/:userId", getUserById);
router.get("/users/:userId/chats", getChatsByUser);
// router.get("/chats/:chatId", getChatById);
router.get("/chats/:chatId/messages", getMessagesForChat);

export default router;