import { Router } from "express";
import usersRoutes from "./users.routes";
import chatsRoutes from "./chats.routes";
import messagesRoutes from "./messages.routes";

const router = Router();

router.use("/users", usersRoutes);
router.use("/chats", chatsRoutes);
router.use("/messages", messagesRoutes);

export default router;