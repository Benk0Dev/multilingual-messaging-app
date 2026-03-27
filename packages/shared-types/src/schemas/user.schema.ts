import { z } from "zod";
import { LanguageCode } from "../enums/index.js";

export const usernameSchema = z
    .string()
    .min(4)
    .max(15)
    .regex(/^[A-Za-z0-9_]+$/);

export const newUserDetailsBodySchema = z.object({
    displayName: z.string().min(1).max(255),
    preferredLang: z.nativeEnum(LanguageCode),
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

export type NewUserDetailsBody = z.infer<typeof newUserDetailsBodySchema>;
export type SearchUsersQuery = z.infer<typeof searchUsersQuerySchema>;