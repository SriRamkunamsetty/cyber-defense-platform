import { useEffect, useRef, useState, useCallback } from "react";

export interface InvestigationEvent {
  type:
    | "agent_start"
    | "agent_progress"
    | "agent_complete"
    | "agent_error"
    | "investigation_complete"
    | "investigation_error"
    | "subscribed";
  investigationId: number;
  agentName?: string;
  progress?: number;
  message?: string;
  data?: Record<string, unknown>;
  timestamp: string;
}

interface UseInvestigationWebSocketOptions {
  investigationId: number | null;
  onEvent?: (event: InvestigationEvent) => void;
  onError?: (error: Error) => void;
}

export function useInvestigationWebSocket({
  investigationId,
  onEvent,
  onError,
}: UseInvestigationWebSocketOptions) {
  const ws = useRef<WebSocket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const connect = useCallback(() => {
    if (!investigationId) return;

    try {
      // Determine WebSocket URL based on current location
      const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
      const host = window.location.host;
      const wsUrl = `${protocol}//${host}/api/ws`;

      console.log("[WebSocket] Connecting to", wsUrl);
      ws.current = new WebSocket(wsUrl);

      ws.current.onopen = () => {
        console.log("[WebSocket] Connected");
        setIsConnected(true);
        setError(null);

        // Subscribe to investigation updates
        if (ws.current) {
          ws.current.send(
            JSON.stringify({
              type: "subscribe",
              investigationId,
            })
          );
        }
      };

      ws.current.onmessage = (event: MessageEvent<string>) => {
        try {
          const message: InvestigationEvent = JSON.parse(event.data);
          console.log("[WebSocket] Received event:", message.type);

          if (onEvent) {
            onEvent(message);
          }
        } catch (error) {
          console.error("[WebSocket] Failed to parse message:", error);
        }
      };

      ws.current.onerror = (event: Event) => {
        console.error("[WebSocket] Error:", event);
        const err = new Error("WebSocket connection error");
        setError(err);
        if (onError) {
          onError(err);
        }
      };

      ws.current.onclose = () => {
        console.log("[WebSocket] Disconnected");
        setIsConnected(false);
        // Auto-reconnect after brief delay if still on same investigation
        if (investigationId) {
          setTimeout(() => connect(), 3000);
        }
      };
    } catch (error) {
      const err =
        error instanceof Error ? error : new Error("Failed to connect");
      setError(err);
      if (onError) {
        onError(err);
      }
    }
  }, [investigationId, onEvent, onError]);

  useEffect(() => {
    if (investigationId) {
      connect();
    }

    return () => {
      if (ws.current) {
        ws.current.close();
      }
    };
  }, [investigationId, connect]);

  return {
    isConnected,
    error,
    reconnect: connect,
  };
}
