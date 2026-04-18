import { useEffect, useRef } from "react";
import { markMessagesAsRead } from "@/src/api/messages";
import type { Message } from "@app/shared-types/models";

type UseMarkAsReadParams = {
    chatId: string | null;
    myUserId: string | null;
    messages: Message[];
    onLocalReceipt: (messageId: string, readAt: string) => void;
    isRealMessageId?: (id: string) => boolean;  // false if optimistic pending message
};

const DEFAULT_IS_REAL = (id: string) => Boolean(id) && !id.startsWith("__");

function messageIsReadForUser(message: Message, userId: string): boolean {
    return message.receipts?.some((r) => r.userId === userId && Boolean(r.readAt)) ?? false;
}

export function useMarkMessagesAsRead({
    chatId,
    myUserId,
    messages,
    onLocalReceipt,
    isRealMessageId = DEFAULT_IS_REAL,
}: UseMarkAsReadParams) {
    // Message ids the server has already acknowledged as read by the current user
    const ackedRef = useRef<Set<string>>(new Set());
    // Message ids currently being sent
    const inFlightRef = useRef<Set<string>>(new Set());
    // AbortController for the currently-active chat's request
    const abortRef = useRef<AbortController | null>(null);
    // Track which chat the current acked-set belongs to
    const activeChatRef = useRef<string | null>(null);

    // Reset state when the active chat changes
    useEffect(() => {
        if (activeChatRef.current !== chatId) {
            activeChatRef.current = chatId;
            ackedRef.current = new Set();
            inFlightRef.current = new Set();
            if (abortRef.current) {
                abortRef.current.abort();
                abortRef.current = null;
            }
        }
    }, [chatId]);

    // Using a signature of the messages so the main effect doesn't re-run on pure receipt updates that don't add/remove messages
    const idsSignature = messages.map((m) => m.id).join("|");

    useEffect(() => {
        if (!chatId || !myUserId || messages.length === 0) return;

        const candidates = messages
            .filter((m) => m.sender.id !== myUserId)
            .filter((m) => isRealMessageId(m.id))
            .filter((m) => !messageIsReadForUser(m, myUserId))
            .map((m) => m.id)
            .filter((id) => !ackedRef.current.has(id))
            .filter((id) => !inFlightRef.current.has(id));

        if (candidates.length === 0) return;

        candidates.forEach((id) => inFlightRef.current.add(id));

        const controller = new AbortController();
        abortRef.current = controller;
        const { signal } = controller;

        (async () => {
            try {
                await markMessagesAsRead({ messageIds: candidates });
                if (signal.aborted) return;

                const readAt = new Date().toISOString();
                candidates.forEach((id) => {
                    ackedRef.current.add(id);
                    onLocalReceipt(id, readAt);
                });
            } catch (e) {
                if (!signal.aborted) {
                    console.error("useMarkMessagesAsRead: failed", e);
                }
            } finally {
                candidates.forEach((id) => inFlightRef.current.delete(id));
            }
        })();

        return () => {
            // Only abort if this exact controller is still the active one
            if (abortRef.current === controller) {
                controller.abort();
                abortRef.current = null;
            }
        };
    }, [chatId, myUserId, idsSignature]);
}
