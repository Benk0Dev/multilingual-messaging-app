import { Router } from "express";
import usersRoutes from "./users.routes";
import chatsRoutes from "./chats.routes";
import messagesRoutes from "./messages.routes";
import { requireOnboarded } from "../middleware/onboarded";

const router = Router();

router.use("/users", usersRoutes);
router.use("/chats", requireOnboarded, chatsRoutes);
router.use("/messages", requireOnboarded, messagesRoutes);

export default router;