import { useEffect, useRef, useState } from "react";
import { WEBSOCKET_URL } from "../../src/config";
import { Chat, Message } from "@app/shared-types/models";

type MessageCreatedEvent = {
    type: "message.created";
    message: Message;
};

type ChatCreatedEvent = {
    type: "chat.created";
    chat: Chat;
};

type WsEvent = MessageCreatedEvent | ChatCreatedEvent;

type UseAppWebSocketParams = {
    accessToken: string | null;
    onEvent?: (event: WsEvent) => void;
};

const MAX_RECONNECT_ATTEMPTS = 10;
const BASE_RECONNECT_DELAY_MS = 1000;
const MAX_RECONNECT_DELAY_MS = 10000;

function getReconnectDelay(attempt: number) {
    const delay = BASE_RECONNECT_DELAY_MS * Math.pow(2, attempt);
    return Math.min(delay, MAX_RECONNECT_DELAY_MS);
}

export default function useAppWebSocket({ accessToken, onEvent }: UseAppWebSocketParams) {
    const wsRef = useRef<WebSocket | null>(null);
    const onEventRef = useRef<typeof onEvent>(onEvent);
    const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const reconnectAttemptRef = useRef(0);
    const intentionallyClosedRef = useRef(false);

    const [isConnected, setIsConnected] = useState(false);

    useEffect(() => {
        onEventRef.current = onEvent;
    }, [onEvent]);

    useEffect(() => {
        if (!accessToken) {
            intentionallyClosedRef.current = true;

            if (reconnectTimeoutRef.current) {
                clearTimeout(reconnectTimeoutRef.current);
                reconnectTimeoutRef.current = null;
            }
            
            if (wsRef.current) {
                wsRef.current.close();
                wsRef.current = null;
            }

            reconnectAttemptRef.current = 0;
            setIsConnected(false);
            return;
        }

        intentionallyClosedRef.current = false;
        let cancelled = false;

        const connect = () => {
            if (cancelled || !accessToken) return;

            const ws = new WebSocket(`${WEBSOCKET_URL}?token=${encodeURIComponent(accessToken)}`);

            wsRef.current = ws;

            ws.onopen = () => {
                console.log("Connected to WebSocket");
                reconnectAttemptRef.current = 0;
                setIsConnected(true);
            };

            ws.onmessage = (event) => {
                try {
                    const payload = JSON.parse(event.data) as WsEvent;
                    onEventRef.current?.(payload);
                } catch (error) {
                    console.error("Failed to parse WebSocket message", error);
                }
            };

            ws.onerror = (error) => {
                console.error("Error from WebSocket", error);
            };

            ws.onclose = () => {
                console.log("Disconnected from WebSocket");
                setIsConnected(false);
                wsRef.current = null;

                if (cancelled || intentionallyClosedRef.current || !accessToken) return;

                if (reconnectAttemptRef.current >= MAX_RECONNECT_ATTEMPTS) {
                    console.warn("Max reconnect attempts reached");
                    return;
                }

                const delay = getReconnectDelay(reconnectAttemptRef.current);
                reconnectAttemptRef.current++;

                console.log(`Reconnecting WebSocket in ${delay}ms`);

                reconnectTimeoutRef.current = setTimeout(() => {
                    reconnectTimeoutRef.current = null;
                    connect();
                }, delay);
            };
        };

        connect();

        return () => {
            cancelled = true;
            intentionallyClosedRef.current = true;

            if (reconnectTimeoutRef.current) {
                clearTimeout(reconnectTimeoutRef.current);
                reconnectTimeoutRef.current = null;
            }

            if (wsRef.current) {
                wsRef.current.close();
                wsRef.current = null;
            }

            reconnectAttemptRef.current = 0;
            setIsConnected(false);
        };
    }, [accessToken]);

  return { isConnected };
};
