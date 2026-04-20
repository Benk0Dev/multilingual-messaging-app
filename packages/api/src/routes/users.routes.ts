import { Router } from "express";
import { validate } from "../middleware/validate";
import {
    createUserBodySchema,
    searchUsersQuerySchema,
    usernameAvailableQuerySchema,
    profilePictureUploadUrlQuerySchema,
} from "@app/shared-types/schemas";
import {
    createUser,
    getMe,
    searchUsers,
    checkUsernameAvailable,
    getProfilePictureUploadUrl,
} from "../controllers/users.controller";
import { requireOnboarded } from "../middleware/onboarded";

const router = Router();

router.post(
    "/",
    validate(createUserBodySchema, "body"),
    createUser
);
router.get(
    "/me",
    getMe
);
router.get(
    "/username-available",
    validate(usernameAvailableQuerySchema, "query"),
    checkUsernameAvailable
);
router.get(
    "/picture-upload-url",
    validate(profilePictureUploadUrlQuerySchema, "query"),
    getProfilePictureUploadUrl
);
router.get(
    "/search",
    requireOnboarded,
    validate(searchUsersQuerySchema, "query"),
    searchUsers
);

export default router;