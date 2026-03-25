export type MessageReceipt = {
    userId: string;
    deliveredAt?: string | null;
    readAt?: string | null;
};

export type MessageReceiptUpdate = {
    messageId: string;
    userId: string;
    deliveredAt?: string | null;
    readAt?: string | null;
};