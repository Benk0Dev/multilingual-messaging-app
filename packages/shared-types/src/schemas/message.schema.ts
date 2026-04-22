import { z } from "zod";

export const createMessageBodySchema = z.object({
    content: z.object({
        text: z.string().min(1),
    }),
    clientId: z.string().optional(),
});

export const getMessagesQuerySchema = z.object({
    limit: z
        .coerce.number()
        .min(1)
        .max(1_000_000)
        .optional()
        .default(20),
    since: z.coerce.date().optional(),
    before: z.coerce.date().optional(),
});

export const updateMessageReceiptBodySchema = z.object({
    messageIds: z.array(z.string().uuid()).min(1),
});

export type CreateMessageBody = z.infer<typeof createMessageBodySchema>;
export type GetMessagesQuery = z.infer<typeof getMessagesQuerySchema>;
export type UpdateMessageReceiptBody = z.infer<typeof updateMessageReceiptBodySchema>;