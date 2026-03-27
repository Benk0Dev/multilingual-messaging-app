import { z } from "zod";

export const uuidSchema = z.string().uuid();

export const isoDateStringSchema = z
  .string()
  .datetime({ offset: true });

export type Uuid = z.infer<typeof uuidSchema>;
export type IsoDateString = z.infer<typeof isoDateStringSchema>;