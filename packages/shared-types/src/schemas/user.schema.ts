import { z } from "zod";
import { LanguageCode } from "../enums/index.js";

export const usernameSchema = z
    .string()
    .min(4)
    .max(15)
    .regex(/^[A-Za-z0-9_]+$/);

export const createUserBodySchema = z.object({
    username: usernameSchema,
    displayName: z.string().min(1).max(255),
    preferredLang: z.nativeEnum(LanguageCode),
    pictureUrl: z.string().url().optional(),
});

export const updateUserBodySchema = z.object({
    username: usernameSchema.optional(),
    displayName: z.string().min(1).max(255).optional(),
    preferredLang: z.nativeEnum(LanguageCode).optional(),
    pictureUrl: z.string().url().nullable().optional(),
});

export const searchUsersQuerySchema = z.object({
    q: z.string().min(1).max(255),
    limit: z
        .coerce.number()
        .min(1)
        .max(100)
        .optional()
        .default(10),
});

export const usernameAvailableQuerySchema = z.object({
    username: usernameSchema,
});
 
export const profilePictureUploadUrlQuerySchema = z.object({
    extension: z.enum(["jpg", "jpeg", "png", "webp"]),
});
 
export type CreateUserBody = z.infer<typeof createUserBodySchema>;
export type UpdateUserBody = z.infer<typeof updateUserBodySchema>;
export type SearchUsersQuery = z.infer<typeof searchUsersQuerySchema>;
export type UsernameAvailableQuery = z.infer<typeof usernameAvailableQuerySchema>;
export type ProfilePictureUploadUrlQuery = z.infer<typeof profilePictureUploadUrlQuerySchema>;