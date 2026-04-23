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
    getAccessToken: (() => Promise<string | null>) | null;
    onEvent?: (event: WsEvent) => void;
};

const MAX_RECONNECT_ATTEMPTS = 10;
const BASE_RECONNECT_DELAY_MS = 1000;
const MAX_RECONNECT_DELAY_MS = 30_000;
const HEARTBEAT_INTERVAL_MS = 4 * 60 * 1000;
const STALE_THRESHOLD_MS = 30_000;
const PROBE_TIMEOUT_MS = 4_000;

function getReconnectDelay(attempt: number) {
    const delay = BASE_RECONNECT_DELAY_MS * Math.pow(2, attempt);
    return Math.min(delay, MAX_RECONNECT_DELAY_MS);
}

export default function useAppWebSocket({ getAccessToken, onEvent }: UseAppWebSocketParams) {
    const wsRef = useRef<WebSocket | null>(null);
    const onEventRef = useRef<typeof onEvent>(onEvent);
    const getAccessTokenRef = useRef<typeof getAccessToken>(getAccessToken);
    const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const reconnectAttemptRef = useRef(0);
    const intentionallyClosedRef = useRef(false);
    const heartbeatIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const lastInboundAtRef = useRef<number>(Date.now());

    const [isConnected, setIsConnected] = useState(false);
    const [connectionCount, setConnectionCount] = useState(0);

    useEffect(() => {
        onEventRef.current = onEvent;
    }, [onEvent]);

    useEffect(() => {
        getAccessTokenRef.current = getAccessToken;
    }, [getAccessToken]);

    const enabled = Boolean(getAccessToken);

    useEffect(() => {
        if (!enabled) {
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

        const forceReconnect = (reason: string) => {
            console.log(`useAppWebSocket: Forcing reconnect (${reason})`);
            const ws = wsRef.current;
            if (ws) {
                try { ws.close(); } catch {}
            }
            wsRef.current = null;
            stopHeartbeat();
            setIsConnected(false);

            reconnectAttemptRef.current = 0;
            if (reconnectTimeoutRef.current) {
                clearTimeout(reconnectTimeoutRef.current);
                reconnectTimeoutRef.current = null;
            }
            connect();
        };

        const probeConnection = () => {
            const ws = wsRef.current;
            if (!ws || ws.readyState !== WebSocket.OPEN) return;

            const sentAt = Date.now();
            try {
                ws.send(JSON.stringify({ action: "ping" }));
            } catch {
                forceReconnect("probe send failed");
                return;
            }

            // If no inbound message arrives within the timeout, the socket is dead
            setTimeout(() => {
                if (cancelled) return;
                if (lastInboundAtRef.current >= sentAt) return; // got something back
                if (wsRef.current === ws) {
                    forceReconnect("probe timeout");
                }
            }, PROBE_TIMEOUT_MS);
        };

        const connect = async () => {
            if (cancelled) return;

            const getter = getAccessTokenRef.current;
            if (!getter) return;

            let accessToken: string | null;
            try {
                accessToken = await getter();
            } catch (e) {
                console.error("useAppWebSocket: Failed to get access token", e);
                accessToken = null;
            }

            if (cancelled) return;

            if (!accessToken) {
                console.warn("useAppWebSocket: No access token available, will not reconnect");
                setIsConnected(false);
                return;
            }

            const ws = new WebSocket(`${WEBSOCKET_URL}?token=${encodeURIComponent(accessToken)}`);

            wsRef.current = ws;

            ws.onopen = () => {
                console.log("useAppWebSocket: Connected to WebSocket");
                reconnectAttemptRef.current = 0;
                lastInboundAtRef.current = Date.now();
                setIsConnected(true);
                setConnectionCount((count) => count + 1);
                startHeartbeat(ws);
            };

            ws.onmessage = (event) => {
                lastInboundAtRef.current = Date.now();
                try {
                    const payload = JSON.parse(event.data);
                    if (payload?.type === "pong") return;
                    onEventRef.current?.(payload as WsEvent);
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

                if (cancelled || intentionallyClosedRef.current) return;

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

        connect();

        // On app foreground, reconnect if socket is gone, probe if it claims to be alive but has been quiet
        let prevAppState: AppStateStatus = AppState.currentState;
        const appStateSub = AppState.addEventListener("change", (next) => {
            const prev = prevAppState;
            prevAppState = next;
            if (!prev.match(/inactive|background/) || next !== "active") return;
            if (cancelled || intentionallyClosedRef.current) return;

            const ws = wsRef.current;

            // If there's no live socket, reconnect from scratch
            if (!ws || ws.readyState === WebSocket.CLOSED || ws.readyState === WebSocket.CLOSING) {
                if (reconnectTimeoutRef.current) {
                    clearTimeout(reconnectTimeoutRef.current);
                    reconnectTimeoutRef.current = null;
                }
                reconnectAttemptRef.current = 0;
                console.log("useAppWebSocket: Foreground - no live socket, reconnecting");
                connect();
                return;
            }

            // If the socket claims to be OPEN/CONNECTING, and it's been quiet for a while, probe it
            const quietFor = Date.now() - lastInboundAtRef.current;
            if (ws.readyState === WebSocket.OPEN && quietFor > STALE_THRESHOLD_MS) {
                console.log(`useAppWebSocket: Foreground - probing connection (quiet for ${quietFor}ms)`);
                probeConnection();
            }
        });

        return () => {
            cancelled = true;
            intentionallyClosedRef.current = true;

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
    }, [enabled]);

    return { isConnected, connectionCount };
}