import { z } from "zod";

export const uuidSchema = z.string().uuid();

export const isoDateStringSchema = z
  .string()
  .datetime({ offset: true });