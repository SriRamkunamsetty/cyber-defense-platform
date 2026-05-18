import { Server as HTTPServer } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { persistInvestigationEvent } from "./_core/eventStore";
import { publishInvestigationEvent } from "./_core/redisBridge";

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

  constructor(server: HTTPServer | unknown) {
    this.wss = new WebSocketServer({ server: server as HTTPServer, path: "/api/ws" });

    this.wss.on("connection", (ws: WebSocket) => {
      ws.on("message", (data: string) => {
        try {
          const message = JSON.parse(data.toString());
          this.handleMessage(ws, message);
        } catch {
          ws.send(JSON.stringify({ type: "error", message: "Invalid message format" }));
        }
      });

      ws.on("close", () => this.removeConnection(ws));
      ws.on("error", (error: Error) => console.error("[WebSocket] Error:", error));
    });
  }

  private handleMessage(
    ws: WebSocket,
    message: { type: string; investigationId?: number }
  ): void {
    if (message.type === "subscribe" && message.investigationId) {
      this.subscribe(ws, message.investigationId);
      ws.send(
        JSON.stringify({ type: "subscribed", investigationId: message.investigationId })
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
  }

  private unsubscribe(ws: WebSocket, investigationId: number): void {
    const clients = this.connections.get(investigationId);
    if (clients) {
      clients.delete(ws);
      if (clients.size === 0) this.connections.delete(investigationId);
    }
  }

  private removeConnection(ws: WebSocket): void {
    for (const clients of this.connections.values()) {
      clients.delete(ws);
    }
  }

  public broadcastEvent(event: InvestigationEvent): void {
    const clients = this.connections.get(event.investigationId);
    if (!clients?.size) return;

    const message = JSON.stringify(event);
    for (const client of clients) {
      if (client.readyState === WebSocket.OPEN) {
        client.send(message);
      }
    }
  }
}

let wsManager: InvestigationWebSocketManager | null = null;

export function initializeWebSocket(server: HTTPServer): void {
  wsManager = new InvestigationWebSocketManager(server);

  import("./_core/redisBridge").then(({ setLocalBroadcastHandler }) => {
    setLocalBroadcastHandler((event) => {
      wsManager?.broadcastEvent(event);
    });
  });

  console.log("[WebSocket] Initialized");
}

export async function broadcastInvestigationEvent(
  event: InvestigationEvent
): Promise<void> {
  await persistInvestigationEvent(event);
  wsManager?.broadcastEvent(event);
  await publishInvestigationEvent(event);
}

export function getWebSocketManager(): InvestigationWebSocketManager | null {
  return wsManager;
}
