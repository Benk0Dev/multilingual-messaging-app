import { z } from "zod";
import { Language } from "../enums/index.js";

export const usernameSchema = z
    .string()
    .min(4)
    .max(15)
    .regex(/^[A-Za-z0-9_]+$/);

export const newUserDetailsSchema = z.object({
    displayName: z.string().min(1).max(255),
    preferredLang: z.nativeEnum(Language),
});

export type NewUserDetails = z.infer<typeof newUserDetailsSchema>;