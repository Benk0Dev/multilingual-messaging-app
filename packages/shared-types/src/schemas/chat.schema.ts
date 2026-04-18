import { z } from "zod";

export const createChatAndSendFirstMessageBodySchema = z.object({
    userIds: z.array(z.string().uuid()),
    content: z.object({
        text: z.string(),
    }),
    clientId: z.string().optional(),
});

export type CreateChatAndSendFirstMessageBody = z.infer<typeof createChatAndSendFirstMessageBodySchema>;