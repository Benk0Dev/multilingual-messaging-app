import { Router } from "express";
import { validate } from "../middleware/validate";
import { newUserDetailsBodySchema, searchUsersQuerySchema } from "@app/shared-types/schemas";
import { createUser, getMe, searchUsers } from "../controllers/users.controller";

const router = Router();

router.post(
    "/",
    validate(newUserDetailsBodySchema, "body"),
    createUser
);
router.get(
    "/me",
    getMe
);
router.get(
    "/search",
    validate(searchUsersQuerySchema, "query"),
    searchUsers
);

export default router;