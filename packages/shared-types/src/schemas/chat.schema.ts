import { z } from "zod";

export const createChatAndSendFirstMessageBodySchema = z.object({
    userIds: z.array(z.string().uuid()),
    content: z.object({
        text: z.string(),
    }),
});

export type CreateChatAndSendFirstMessageBody = z.infer<typeof createChatAndSendFirstMessageBodySchema>;