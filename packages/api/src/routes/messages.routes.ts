import { Router } from "express";
import { getMessages } from "../controllers/messages.controller";

const router = Router();

router.get("/chat/:chatId", getMessages);

export default router;