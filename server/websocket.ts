import { Server as HTTPServer } from "http";
import { WebSocketServer, WebSocket } from "ws";

export type { HTTPServer };

export interface InvestigationEvent {
  type:
    | "agent_start"
    | "agent_progress"
    | "agent_complete"
    | "agent_error"
    | "investigation_complete"
    | "investigation_error";
  investigationId: number;
  agentName?: string;
  progress?: number;
  message?: string;
  data?: Record<string, unknown>;
  timestamp: string;
}

class InvestigationWebSocketManager {
  private wss: WebSocketServer;
  private connections: Map<number, Set<WebSocket>> = new Map();

  constructor(server: HTTPServer | any) {
    this.wss = new WebSocketServer({ server, path: "/api/ws" });

    this.wss.on("connection", (ws: WebSocket) => {
      console.log("[WebSocket] New client connected");

      ws.on("message", (data: string) => {
        try {
          const message = JSON.parse(data);
          this.handleMessage(ws, message);
        } catch (error) {
          console.error("[WebSocket] Failed to parse message:", error);
          ws.send(
            JSON.stringify({
              type: "error",
              message: "Invalid message format",
            })
          );
        }
      });

      ws.on("close", () => {
        console.log("[WebSocket] Client disconnected");
        this.removeConnection(ws);
      });

      ws.on("error", (error: Error) => {
        console.error("[WebSocket] Error:", error);
      });
    });
  }

  private handleMessage(
    ws: WebSocket,
    message: { type: string; investigationId?: number }
  ): void {
    if (message.type === "subscribe" && message.investigationId) {
      this.subscribe(ws, message.investigationId);
      ws.send(
        JSON.stringify({
          type: "subscribed",
          investigationId: message.investigationId,
        })
      );
    } else if (message.type === "unsubscribe" && message.investigationId) {
      this.unsubscribe(ws, message.investigationId);
    }
  }

  private subscribe(ws: WebSocket, investigationId: number): void {
    if (!this.connections.has(investigationId)) {
      this.connections.set(investigationId, new Set());
    }
    this.connections.get(investigationId)!.add(ws);
    console.log(
      `[WebSocket] Client subscribed to investigation ${investigationId}`
    );
  }

  private unsubscribe(ws: WebSocket, investigationId: number): void {
    const clients = this.connections.get(investigationId);
    if (clients) {
      clients.delete(ws);
      if (clients.size === 0) {
        this.connections.delete(investigationId);
      }
    }
  }

  private removeConnection(ws: WebSocket): void {
    const entries = Array.from(this.connections.values());
    for (const clients of entries) {
      clients.delete(ws);
    }
  }

  public broadcastEvent(event: InvestigationEvent): void {
    const clients = this.connections.get(event.investigationId);
    if (!clients || clients.size === 0) {
      console.log(
        `[WebSocket] No clients subscribed to investigation ${event.investigationId}`
      );
      return;
    }

    const message = JSON.stringify(event);
    let successCount = 0;

    const clientsArray = Array.from(clients);
    for (const client of clientsArray) {
      if (client.readyState === WebSocket.OPEN) {
        client.send(message, (error: Error | undefined) => {
          if (error) {
            console.error("[WebSocket] Failed to send message:", error);
          } else {
            successCount++;
          }
        });
      }
    }

    console.log(
      `[WebSocket] Broadcast event to ${successCount}/${clients.size} clients for investigation ${event.investigationId}`
    );
  }

  public getConnectionCount(investigationId: number): number {
    return this.connections.get(investigationId)?.size || 0;
  }
}

let wsManager: InvestigationWebSocketManager | null = null;

export function initializeWebSocket(server: HTTPServer): void {
  wsManager = new InvestigationWebSocketManager(server);
  console.log("[WebSocket] Initialized");
}

export function broadcastInvestigationEvent(event: InvestigationEvent): void {
  if (!wsManager) {
    console.warn("[WebSocket] Manager not initialized");
    return;
  }
  wsManager.broadcastEvent(event);
}

export function getWebSocketManager(): InvestigationWebSocketManager | null {
  return wsManager;
}
