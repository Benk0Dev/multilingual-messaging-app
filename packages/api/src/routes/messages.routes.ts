import { Router } from "express";
import { validate } from "../middleware/validate";
import { updateMessageReceiptBodySchema } from "@app/shared-types/schemas";
import { markMessagesAsDelivered, markMessagesAsRead } from "../controllers/messages.controller";

const router = Router();

router.post(
    "/delivered",
    validate(updateMessageReceiptBodySchema, "body"),
    markMessagesAsDelivered
);
router.post(
    "/read",
    validate(updateMessageReceiptBodySchema, "body"),
    markMessagesAsRead
);

export default router;