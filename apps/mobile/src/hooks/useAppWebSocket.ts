import { useEffect, useRef, useState } from "react";
import { WEBSOCKET_URL } from "../../src/config";
import { Chat, Message, MessageReceiptUpdate } from "@app/shared-types/models";
import { AppStateStatus } from "react-native";
import { AppState } from "react-native";

type ChatCreatedEvent = {
    type: "chat.created";
    chat: Chat;
};

type MessageCreatedEvent = {
    type: "message.created";
    message: Message;
};

type MessageDeliveredEvent = {
    type: "message.receipt.updated";
    data: MessageReceiptUpdate[];
};

type WsEvent = MessageCreatedEvent | ChatCreatedEvent | MessageDeliveredEvent;

type UseAppWebSocketParams = {
    accessToken: string | null;
    onEvent?: (event: WsEvent) => void;
};

const MAX_RECONNECT_ATTEMPTS = 10;
const BASE_RECONNECT_DELAY_MS = 1000;
const MAX_RECONNECT_DELAY_MS = 30_000;
const HEARTBEAT_INTERVAL_MS = 4 * 60 * 1000;

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
    const heartbeatIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const connectRef = useRef<(() => void) | null>(null);

    const [isConnected, setIsConnected] = useState(false);
    const [connectionCount, setConnectionCount] = useState(0);

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
            if (heartbeatIntervalRef.current) {
                clearInterval(heartbeatIntervalRef.current);
                heartbeatIntervalRef.current = null;
            }
            
            if (wsRef.current) {
                wsRef.current.close();
                wsRef.current = null;
            }

            reconnectAttemptRef.current = 0;
            connectRef.current = null;
            setIsConnected(false);
            return;
        }

        intentionallyClosedRef.current = false;
        let cancelled = false;

        const startHeartbeat = (ws: WebSocket) => {
            if (heartbeatIntervalRef.current) {
                clearInterval(heartbeatIntervalRef.current);
            }
            heartbeatIntervalRef.current = setInterval(() => {
                if (ws.readyState === WebSocket.OPEN) {
                    try {
                        ws.send(JSON.stringify({ action: "ping" }));
                    } catch {}
                }
            }, HEARTBEAT_INTERVAL_MS);
        };

        const stopHeartbeat = () => {
            if (heartbeatIntervalRef.current) {
                clearInterval(heartbeatIntervalRef.current);
                heartbeatIntervalRef.current = null;
            }
        };

        const connect = () => {
            if (cancelled || !accessToken) return;

            const ws = new WebSocket(`${WEBSOCKET_URL}?token=${encodeURIComponent(accessToken)}`);

            wsRef.current = ws;

            ws.onopen = () => {
                console.log("useAppWebSocket: Connected to WebSocket");
                reconnectAttemptRef.current = 0;
                setIsConnected(true);
                setConnectionCount((count) => count + 1);
                startHeartbeat(ws);
            };

            ws.onmessage = (event) => {
                try {
                    const payload = JSON.parse(event.data) as WsEvent;
                    onEventRef.current?.(payload);
                } catch (error) {
                    console.error("useAppWebSocket: Failed to parse WebSocket message", error);
                }
            };

            ws.onerror = () => {
                console.error("useAppWebSocket: Error");
            };

            ws.onclose = (event) => {
                console.log(
                    `useAppWebSocket: Disconnected (code=${event.code}${
                        event.reason ? `, reason=${event.reason}` : ""
                    })`
                );
                setIsConnected(false);
                wsRef.current = null;
                stopHeartbeat();

                if (cancelled || intentionallyClosedRef.current || !accessToken) return;

                if (reconnectAttemptRef.current >= MAX_RECONNECT_ATTEMPTS) {
                    console.warn("useAppWebSocket: Max reconnect attempts reached; will retry on app foreground");
                    return;
                }

                const delay = getReconnectDelay(reconnectAttemptRef.current);
                reconnectAttemptRef.current++;

                console.log(`useAppWebSocket: Reconnecting WebSocket in ${delay}ms`);

                reconnectTimeoutRef.current = setTimeout(() => {
                    reconnectTimeoutRef.current = null;
                    connect();
                }, delay);
            };
        };

        connectRef.current = connect;
        connect();

        // Re-connect when the app comes back to the foreground and reset the reconnect attempts to 0
        let prevAppState: AppStateStatus = AppState.currentState;
        const appStateSub = AppState.addEventListener("change", (next) => {
            const prev = prevAppState;
            prevAppState = next;
            if (!prev.match(/inactive|background/) || next !== "active") return;
            if (cancelled || intentionallyClosedRef.current || !accessToken) return;

            const ws = wsRef.current;
            const isAlive = ws && (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING);
            if (isAlive) return;

            if (reconnectTimeoutRef.current) {
                clearTimeout(reconnectTimeoutRef.current);
                reconnectTimeoutRef.current = null;
            }
            reconnectAttemptRef.current = 0;
            console.log("useAppWebSocket: Foreground - retrying connection");
            connect();
        });

        return () => {
            cancelled = true;
            intentionallyClosedRef.current = true;
            connectRef.current = null;

            appStateSub.remove();

            if (reconnectTimeoutRef.current) {
                clearTimeout(reconnectTimeoutRef.current);
                reconnectTimeoutRef.current = null;
            }
            stopHeartbeat();

            if (wsRef.current) {
                wsRef.current.close();
                wsRef.current = null;
            }

            reconnectAttemptRef.current = 0;
            setIsConnected(false);
        };
    }, [accessToken]);

  return { isConnected, connectionCount };
};
