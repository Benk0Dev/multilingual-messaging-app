import { useEffect, useRef, useState } from "react";
import { WEBSOCKET_URL } from "../../src/config";
import { Message } from "@app/shared-types/models";

type WsEvent = {
    type: "message.created";
    message: Message;
}

type UseAppWebSocketParams = {
    accessToken: string | null;
    onEvent?: (event: WsEvent) => void;
}

export default function useAppWebSocket({ accessToken, onEvent }: UseAppWebSocketParams) {
    const wsRef = useRef<WebSocket | null>(null);
    const onEventRef = useRef<typeof onEvent>(onEvent);
    const [isConnected, setIsConnected] = useState(false);

    useEffect(() => {
        onEventRef.current = onEvent;
    }, [onEvent]);

    useEffect(() => {
        let isMounted = true;

        if (!accessToken) {
            if (wsRef.current) {
                wsRef.current.close();
                wsRef.current = null;
            }
            setIsConnected(false);
            return;
        }

        const ws = new WebSocket(`${WEBSOCKET_URL}?token=${encodeURIComponent(accessToken)}`);

        ws.onopen = () => {
            if (!isMounted) return;
            console.log("Connected to WebSocket");
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
        };

        wsRef.current = ws;

        return () => {
            isMounted = false;

            if (wsRef.current) {
                wsRef.current.close();
                wsRef.current = null;
            }

            setIsConnected(false);
        };
    }, [accessToken]);

  return { isConnected };
};
