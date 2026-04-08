import type { Message } from "@app/shared-types/models";

export interface GroupFlags {
    isFirstInGroup: boolean;
    isLastInGroup: boolean;
}

export interface DatePillFlag {
    showDatePill: boolean;
}

function toLocalDayKey(isoDate: string): string {
    const d = new Date(isoDate);
    return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}

export function computeGroupFlags(
    messages: Message[]
): (Message & GroupFlags)[] {
    return messages.map((msg, i) => {
        const prev = messages[i - 1];
        const next = messages[i + 1];
        const sameSenderAsPrev = prev && prev.sender.id === msg.sender.id;
        const sameSenderAsNext = next && next.sender.id === msg.sender.id;
        const closeEnoughToPrev = prev && Math.abs(new Date(msg.createdAt).getTime() - new Date(prev.createdAt).getTime()) <= 45000;
        const closeEnoughToNext = next && Math.abs(new Date(next.createdAt).getTime() - new Date(msg.createdAt).getTime()) <= 45000;
        return {
            ...msg,
            isFirstInGroup: !(sameSenderAsPrev && closeEnoughToPrev),
            isLastInGroup: !(sameSenderAsNext && closeEnoughToNext),
        };
    });
}

export function computeDatePillFlags<T extends Message>(
    messages: T[]
): (T & DatePillFlag)[] {
    return messages.map((msg, i) => {
        if (i === messages.length - 1) {
            return { ...msg, showDatePill: true };
        }

        const next = messages[i + 1];
        const isNewDay = toLocalDayKey(msg.createdAt) !== toLocalDayKey(next.createdAt);
        return {
            ...msg,
            showDatePill: isNewDay,
        };
    });
}

export type ReceiptStatus = "sent" | "delivered" | "read";

export function getReceiptStatus(
    message: Message,
    myUserId: string
): ReceiptStatus {
    if (message.sender.id !== myUserId) return "sent";

    const recipients = (message.receipts ?? []).filter(
        (r) => r.userId !== message.sender.id
    );

    if (recipients.length === 0) return "sent";
    if (recipients.every((r) => r.readAt)) return "read";
    if (recipients.every((r) => r.deliveredAt)) return "delivered";

    return "sent";
}

export function countUnread(
    messages: Message[] | undefined,
    myUserId: string
): number {
    if (!messages?.length) return 0;

    let count = 0;
    for (const m of messages) {
        if (m.isDeleted || m.sender.id === myUserId) continue;
        const myReceipt = m.receipts?.find((r) => r.userId === myUserId);
        if (!myReceipt || !myReceipt.readAt) count++;
    }
    return count;
}