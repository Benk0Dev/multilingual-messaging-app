import { Router } from "express";
import chatsRouter from "./messages.routes";

const router = Router();

router.use("/messages", chatsRouter);

export default router;